import { ApiProperty } from '@nestjs/swagger';
import { PersonalityType } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class CompleteOnboardingDto {
  @ApiProperty({
    description: '회원 닉네임. User.name 으로 저장됨.',
    example: '지원',
    minLength: 1,
    maxLength: 20,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  nickname!: string;

  @ApiProperty({
    enum: PersonalityType,
    description: '온보딩 캐릭터 매칭 결과. 6개 중 1개.',
    example: 'STRAIGHT_SHOOTER',
  })
  @IsEnum(PersonalityType)
  personality!: PersonalityType;
}
