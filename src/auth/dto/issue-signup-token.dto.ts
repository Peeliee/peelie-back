import { AuthProvider } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class IssueSignupTokenDto {
  @IsEnum(AuthProvider)
  provider!: AuthProvider;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  providerUserId!: string;
}
