import type { AuthProvider } from '@prisma/client';

export interface SignupContext {
  provider: AuthProvider;
  providerUserId: string;
}
