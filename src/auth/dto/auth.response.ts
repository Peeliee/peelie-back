import { ApiProperty } from '@nestjs/swagger';
import { PersonalityType } from '@prisma/client';

export class AuthTokensDto {
  @ApiProperty({ description: '15분 TTL JWT', example: 'eyJhbGciOi...' })
  accessToken!: string;

  @ApiProperty({
    description: '14일 TTL JWT (DB hash 저장)',
    example: 'eyJhbGciOi...',
  })
  refreshToken!: string;
}

export class SignInLoginResponseDto extends AuthTokensDto {
  @ApiProperty({ enum: ['login'], example: 'login' })
  type!: 'login';
}

export class SignInSignupResponseDto {
  @ApiProperty({ enum: ['signup'], example: 'signup' })
  type!: 'signup';

  @ApiProperty({
    description:
      '10분 TTL signup JWT. 이어서 /auth/onboarding/complete 호출 시 Authorization 헤더에 사용.',
    example: 'eyJhbGciOi...',
  })
  signupToken!: string;
}

export class OnboardedUserDto {
  @ApiProperty({ example: 'cmp...' })
  id!: string;

  @ApiProperty({ example: '지원' })
  nickname!: string;

  @ApiProperty({ enum: PersonalityType })
  personality!: PersonalityType;

  @ApiProperty({
    example: 'abc12345',
    description: '8자 영숫자 영구 친구 코드',
  })
  friendCode!: string;
}

export class CompleteOnboardingResponseDto extends AuthTokensDto {
  @ApiProperty({ type: OnboardedUserDto })
  user!: OnboardedUserDto;
}

// 기존 코드 호환용 type alias
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type IssueSignupTokenResponse =
  | { type: 'login'; accessToken: string; refreshToken: string }
  | { type: 'signup'; signupToken: string };

export interface CompleteOnboardingResponse extends AuthTokens {
  user: {
    id: string;
    nickname: string;
    personality: PersonalityType;
    friendCode: string;
  };
}
