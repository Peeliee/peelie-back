import { PersonalityType } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class CompleteOnboardingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  nickname!: string;

  @IsEnum(PersonalityType)
  personality!: PersonalityType;
}
