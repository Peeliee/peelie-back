import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, type PersonalityType, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { AppleOAuthClient } from './apple-oauth.client';
import type {
  AuthTokens,
  CompleteOnboardingResponse,
  IssueSignupTokenResponse,
} from './dto/auth.response';
import { generateFriendCode } from './friend-code.util';
import { KakaoOAuthClient } from './kakao-oauth.client';
import type { SignupContext } from './signup-context';

const ACCESS_TTL = '365d';
const REFRESH_TTL = '365d';
const REFRESH_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const SIGNUP_TTL = '10m';

const FRIEND_CODE_MAX_RETRY = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly kakaoClient: KakaoOAuthClient,
    private readonly appleClient: AppleOAuthClient,
  ) {}

  /**
   * 카카오 웹 로그인: authorization code 로 카카오 토큰 교환 + 사용자 ID 조회 후
   * 기존 계정이면 access/refresh, 신규면 signupToken 발급.
   */
  async signInWithKakaoWeb(code: string): Promise<IssueSignupTokenResponse> {
    const token = await this.kakaoClient.exchangeCode(code);
    const kakaoUser = await this.kakaoClient.fetchUser(token.access_token);
    return this.issueByProvider(AuthProvider.KAKAO, String(kakaoUser.id));
  }

  /**
   * 카카오 네이티브 앱 로그인: 앱이 SDK 로 받은 access token 을 서버가 받아
   * kapi.kakao.com 으로 사용자 ID 조회 후 분기.
   */
  async signInWithKakaoApp(
    accessToken: string,
  ): Promise<IssueSignupTokenResponse> {
    const kakaoUser = await this.kakaoClient.fetchUser(accessToken);
    return this.issueByProvider(AuthProvider.KAKAO, String(kakaoUser.id));
  }

  /**
   * Apple 네이티브 앱 로그인: authorization code 를 서버에서 검증.
   * .p8 으로 client_secret 서명 → Apple 토큰 엔드포인트 호출 → id_token 검증.
   * payload.sub = Apple 안정적 user ID. 기존 계정이면 login, 신규면 signupToken.
   */
  async signInWithAppleApp(
    authorizationCode: string,
  ): Promise<IssueSignupTokenResponse> {
    const { sub } =
      await this.appleClient.verifyAuthorizationCode(authorizationCode);
    return this.issueByProvider(AuthProvider.APPLE, sub);
  }

  /**
   * 소셜 provider 식별자로 기존 계정 조회.
   * 있으면 access/refresh 발급, 없으면 signupToken 발급.
   */
  async issueByProvider(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<IssueSignupTokenResponse> {
    const account = await this.prisma.account.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
    });

    if (account) {
      const tokens = await this.issueAuthTokens(account.userId);
      return { type: 'login', ...tokens };
    }

    const signupToken = this.jwtService.sign(
      { type: 'signup', provider, providerUserId },
      {
        secret: this.requireSecret('JWT_SIGNUP_SECRET'),
        expiresIn: SIGNUP_TTL,
      },
    );
    return { type: 'signup', signupToken };
  }

  /**
   * signupToken 으로 검증된 가입 컨텍스트와 닉네임/personality 를 받아
   * User + Avatar + Account 를 트랜잭션으로 생성하고 access/refresh 발급.
   */
  async completeOnboarding(
    ctx: SignupContext,
    nickname: string,
    personality: PersonalityType,
  ): Promise<CompleteOnboardingResponse> {
    // signupToken 발급 후 다른 흐름으로 이미 가입됐을 가능성 (race 또는 토큰 재사용)
    const existing = await this.prisma.account.findUnique({
      where: {
        provider_providerUserId: {
          provider: ctx.provider,
          providerUserId: ctx.providerUserId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('이미 가입된 계정입니다');
    }

    const user = await this.createUserWithFriendCode(
      ctx,
      nickname,
      personality,
    );
    const tokens = await this.issueAuthTokens(user.id);
    return {
      user: {
        id: user.id,
        nickname: user.name,
        personality: user.personality,
        friendCode: user.friendCode,
      },
      ...tokens,
    };
  }

  private async createUserWithFriendCode(
    ctx: SignupContext,
    nickname: string,
    personality: PersonalityType,
  ) {
    for (let attempt = 0; attempt < FRIEND_CODE_MAX_RETRY; attempt++) {
      const friendCode = generateFriendCode(8);
      try {
        return await this.prisma.user.create({
          data: {
            name: nickname,
            personality,
            friendCode,
            avatar: { create: {} },
            accounts: {
              create: {
                provider: ctx.provider,
                providerUserId: ctx.providerUserId,
              },
            },
          },
        });
      } catch (error) {
        if (
          this.isFriendCodeConflict(error) &&
          attempt < FRIEND_CODE_MAX_RETRY - 1
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new InternalServerErrorException(
      'friend code 발급 실패 (재시도 한도 초과)',
    );
  }

  private isFriendCodeConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(
        (error.meta as { target?: string[] } | undefined)?.target,
      ) &&
      (error.meta as { target: string[] }).target.includes('friendCode')
    );
  }

  private async issueAuthTokens(userId: string): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.requireSecret('JWT_ACCESS_SECRET'),
        expiresIn: ACCESS_TTL,
      },
    );

    const jti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: userId, jti },
      {
        secret: this.requireSecret('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TTL,
      },
    );
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }

  private requireSecret(
    name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET' | 'JWT_SIGNUP_SECRET',
  ): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`${name} is not configured`);
    }
    return value;
  }
}
