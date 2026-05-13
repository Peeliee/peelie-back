import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class IssueSignupTokenDto {
  @ApiProperty({
    enum: AuthProvider,
    description: 'KAKAO 또는 APPLE',
    example: 'KAKAO',
  })
  @IsEnum(AuthProvider)
  provider!: AuthProvider;

  @ApiProperty({
    description:
      'OAuth provider 가 발급한 사용자 고유 ID. dev mock endpoint 에선 임의 문자열.',
    example: 'kakao_12345',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  providerUserId!: string;
}
