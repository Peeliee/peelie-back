import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  type CryptoKey,
  createRemoteJWKSet,
  importPKCS8,
  jwtVerify,
  SignJWT,
} from 'jose';

const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = new URL('https://appleid.apple.com/auth/keys');

interface AppleTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

@Injectable()
export class AppleOAuthClient {
  private privateKey: CryptoKey | null = null;
  private readonly jwks = createRemoteJWKSet(APPLE_JWKS_URL);

  /**
   * 네이티브 앱이 받은 authorization code 를 검증.
   * client_secret JWT 를 생성해 Apple 토큰 엔드포인트 호출 → id_token 검증 → sub 반환.
   */
  async verifyAuthorizationCode(
    code: string,
  ): Promise<{ sub: string; email?: string }> {
    const clientSecret = await this.generateClientSecret();
    const bundleId = this.requireEnv('APPLE_BUNDLE_ID');

    const body = new URLSearchParams();
    body.set('client_id', bundleId);
    body.set('client_secret', clientSecret);
    body.set('code', code);
    body.set('grant_type', 'authorization_code');

    const res = await fetch(APPLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const detail = await safeReadText(res);
      throw new UnauthorizedException(
        `Apple 인증 코드 교환에 실패했습니다 (${res.status}): ${detail}`,
      );
    }

    const tokenRes = (await res.json()) as AppleTokenResponse;
    return this.verifyIdToken(tokenRes.id_token, bundleId);
  }

  /**
   * client_secret = ES256 으로 서명한 5분 TTL JWT.
   * Apple 은 매 요청마다 새로 생성된 client_secret 을 요구.
   */
  private async generateClientSecret(): Promise<string> {
    const teamId = this.requireEnv('APPLE_TEAM_ID');
    const keyId = this.requireEnv('APPLE_KEY_ID');
    const bundleId = this.requireEnv('APPLE_BUNDLE_ID');
    const privateKey = await this.loadPrivateKey();

    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt(now)
      .setExpirationTime(now + 5 * 60)
      .setAudience(APPLE_ISSUER)
      .setSubject(bundleId)
      .sign(privateKey);
  }

  private async loadPrivateKey(): Promise<CryptoKey> {
    if (this.privateKey) return this.privateKey;
    const pem = this.requireEnv('APPLE_PRIVATE_KEY');
    this.privateKey = await importPKCS8(pem, 'ES256');
    return this.privateKey;
  }

  private async verifyIdToken(
    idToken: string,
    audience: string,
  ): Promise<{ sub: string; email?: string }> {
    try {
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: APPLE_ISSUER,
        audience,
      });
      if (typeof payload.sub !== 'string') {
        throw new Error('id_token 의 sub 가 없습니다');
      }
      return {
        sub: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
      };
    } catch (error) {
      throw new UnauthorizedException(
        `Apple id_token 검증 실패: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  private requireEnv(
    name:
      | 'APPLE_TEAM_ID'
      | 'APPLE_KEY_ID'
      | 'APPLE_BUNDLE_ID'
      | 'APPLE_PRIVATE_KEY',
  ): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`${name} is not configured`);
    }
    return value;
  }
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '<no body>';
  }
}
