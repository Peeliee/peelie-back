import type { PersonalityType } from '@prisma/client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type IssueSignupTokenResponse =
  | { type: 'signup'; signupToken: string }
  | ({ type: 'login' } & AuthTokens);

export interface CompleteOnboardingResponse extends AuthTokens {
  user: {
    id: string;
    nickname: string;
    personality: PersonalityType;
    friendCode: string;
  };
}
