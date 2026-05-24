import type { AuthProvider } from '@prisma/client';

export interface SignupContext {
  provider: AuthProvider;
  providerUserId: string;
  // Apple 신규 가입 시 함께 받은 refresh_token. 회원탈뢰 시 Apple revoke 호출용.
  // 카카오는 항상 undefined.
  providerRefreshToken?: string;
}
