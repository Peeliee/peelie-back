import { Injectable, UnauthorizedException } from '@nestjs/common';

const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USER_URL = 'https://kapi.kakao.com/v2/user/me';

interface KakaoTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface KakaoUserResponse {
  // 카카오 사용자 고유 ID (number → 우리는 string 으로 저장)
  id: number;
}

@Injectable()
export class KakaoOAuthClient {
  /**
   * 카카오 authorization code 를 카카오 access token 으로 교환.
   * redirect_uri 는 사용자 인증 시 사용된 값과 정확히 일치해야 함.
   */
  async exchangeCode(code: string): Promise<KakaoTokenResponse> {
    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('client_id', this.requireEnv('KAKAO_REST_API_KEY'));
    body.append('redirect_uri', this.requireEnv('KAKAO_REDIRECT_URI'));
    body.append('code', code);

    const clientSecret = process.env.KAKAO_CLIENT_SECRET;
    if (clientSecret) body.append('client_secret', clientSecret);

    const res = await fetch(KAKAO_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const detail = await safeReadText(res);
      throw new UnauthorizedException(
        `카카오 인증 코드 교환에 실패했습니다 (${res.status}): ${detail}`,
      );
    }
    return (await res.json()) as KakaoTokenResponse;
  }

  /** 카카오 access token 으로 사용자 고유 ID 조회 */
  async fetchUser(accessToken: string): Promise<KakaoUserResponse> {
    const res = await fetch(KAKAO_USER_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const detail = await safeReadText(res);
      throw new UnauthorizedException(
        `카카오 사용자 정보 조회에 실패했습니다 (${res.status}): ${detail}`,
      );
    }
    return (await res.json()) as KakaoUserResponse;
  }

  private requireEnv(
    name: 'KAKAO_REST_API_KEY' | 'KAKAO_REDIRECT_URI',
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
