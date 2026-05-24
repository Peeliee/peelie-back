import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../common/dto/api-response.dto';
import {
  ApiOkResponseWrapped,
  ApiOkResponseWrappedOneOf,
} from '../common/decorators/api-ok-response-wrapped.decorator';
import { AuthService } from './auth.service';
import { CurrentSignupContext } from './current-signup-context.decorator';
import {
  CompleteOnboardingResponseDto,
  SignInLoginResponseDto,
  SignInSignupResponseDto,
  type CompleteOnboardingResponse,
  type IssueSignupTokenResponse,
} from './dto/auth.response';
import { AppleAppLoginDto } from './dto/apple-app-login.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { IssueSignupTokenDto } from './dto/issue-signup-token.dto';
import { KakaoAppLoginDto } from './dto/kakao-app-login.dto';
import { KakaoWebLoginDto } from './dto/kakao-web-login.dto';
import { Public } from './public.decorator';
import type { SignupContext } from './signup-context';
import { SignupTokenGuard } from './signup-token.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * dev-only 임시 입구.
   * 진짜 카카오/Apple OAuth 붙으면 `/auth/kakao/app`, `/auth/apple/app` 등으로 분기되고
   * 이 endpoint 는 prod 빌드에서 제거.
   */
  @Public()
  @Post('dev/signup-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[dev] provider 식별자로 signupToken 또는 access/refresh 발급',
    description:
      '진짜 카카오/Apple OAuth 붙기 전 임시 입구. (provider, providerUserId) 를 받아 ' +
      '기존 계정이면 login 응답, 신규면 signupToken 발급. signupToken 으로 onboarding/complete 호출.',
  })
  @ApiOkResponseWrappedOneOf(
    [SignInLoginResponseDto, SignInSignupResponseDto],
    {
      description:
        '기존 계정: SignInLoginResponseDto / 신규: SignInSignupResponseDto',
    },
  )
  issueSignupToken(
    @Body() dto: IssueSignupTokenDto,
  ): Promise<IssueSignupTokenResponse> {
    return this.authService.issueByProvider(dto.provider, dto.providerUserId);
  }

  /**
   * 카카오 웹 로그인.
   * 프론트가 카카오 인증 페이지 → redirect_uri 로 받은 authorization code 를 전달.
   */
  @Public()
  @Post('oauth/kakao/web/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '카카오 웹 로그인 (code 교환)',
    description:
      '카카오 redirect_uri 로 받은 authorization code 를 백엔드가 토큰 + 사용자 정보로 교환. ' +
      '기존 회원: login 응답 (access/refresh). 신규 회원: signupToken 응답 → /auth/onboarding/complete 호출.',
  })
  @ApiOkResponseWrappedOneOf(
    [SignInLoginResponseDto, SignInSignupResponseDto],
    {
      description:
        '기존 회원: SignInLoginResponseDto / 신규: SignInSignupResponseDto',
    },
  )
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: '카카오 인증 코드 교환 또는 사용자 정보 조회 실패',
  })
  signInWithKakaoWeb(
    @Body() dto: KakaoWebLoginDto,
  ): Promise<IssueSignupTokenResponse> {
    return this.authService.signInWithKakaoWeb(dto.code);
  }

  /**
   * 카카오 네이티브 앱 로그인.
   * 앱이 카카오 SDK 로 받은 access token 을 그대로 전달. 서버가 카카오 user API 호출하여 사용자 식별.
   */
  @Public()
  @Post('oauth/kakao/app/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '카카오 네이티브 앱 로그인 (access token 검증)',
    description:
      'iOS/Android 앱이 카카오 SDK 로 받은 accessToken 을 백엔드가 받아 ' +
      'kapi.kakao.com/v2/user/me 호출하여 사용자 ID 조회. ' +
      '기존 회원: login 응답 (access/refresh). 신규 회원: signupToken 응답 → /auth/onboarding/complete 호출.',
  })
  @ApiOkResponseWrappedOneOf(
    [SignInLoginResponseDto, SignInSignupResponseDto],
    {
      description:
        '기존 회원: SignInLoginResponseDto / 신규: SignInSignupResponseDto',
    },
  )
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: '카카오 access token 이 유효하지 않거나 사용자 정보 조회 실패',
  })
  signInWithKakaoApp(
    @Body() dto: KakaoAppLoginDto,
  ): Promise<IssueSignupTokenResponse> {
    return this.authService.signInWithKakaoApp(dto.accessToken);
  }

  /**
   * Apple 네이티브 앱 로그인.
   * iOS 앱이 Apple 로그인 후 받은 authorization code 를 전달.
   * 서버가 .p8 으로 client_secret 서명 → Apple 토큰 엔드포인트 호출 → id_token 검증.
   */
  @Public()
  @Post('oauth/apple/app/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apple 네이티브 앱 로그인 (authorization code 검증)',
    description:
      'iOS 앱이 Apple 로그인 후 받은 authorizationCode 를 백엔드가 검증. ' +
      '서버가 .p8 으로 client_secret JWT 서명 → Apple 토큰 엔드포인트 호출 → id_token 검증 → sub 추출. ' +
      '기존 회원: login 응답 (access/refresh). 신규 회원: signupToken 응답 → /auth/onboarding/complete 호출.',
  })
  @ApiOkResponseWrappedOneOf(
    [SignInLoginResponseDto, SignInSignupResponseDto],
    {
      description:
        '기존 회원: SignInLoginResponseDto / 신규: SignInSignupResponseDto',
    },
  )
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'Apple 인증 코드 교환 또는 id_token 검증 실패',
  })
  signInWithAppleApp(
    @Body() dto: AppleAppLoginDto,
  ): Promise<IssueSignupTokenResponse> {
    return this.authService.signInWithAppleApp(dto.authorizationCode);
  }

  @Public()
  @UseGuards(SignupTokenGuard)
  @Post('onboarding/complete')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '온보딩 완료 (User + Avatar + Account 생성)',
    description:
      'signupToken (Authorization: Bearer ...) 으로 검증된 가입 컨텍스트에 ' +
      'nickname + personality 를 받아 트랜잭션으로 User/Avatar/Account 생성. friendCode 자동 발급. ' +
      '응답으로 access/refresh 발급. signupToken 재사용 차단 (이미 가입된 계정이면 409).',
  })
  @ApiOkResponseWrapped(CompleteOnboardingResponseDto, {
    status: 201,
    description: 'User + Avatar + Account 생성 + 토큰 발급',
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
    description: 'signupToken 누락/만료/위변조',
  })
  completeOnboarding(
    @CurrentSignupContext() ctx: SignupContext,
    @Body() dto: CompleteOnboardingDto,
  ): Promise<CompleteOnboardingResponse> {
    return this.authService.completeOnboarding(
      ctx,
      dto.nickname,
      dto.personality,
    );
  }
}
