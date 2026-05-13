import { ApiPropertyOptional } from '@nestjs/swagger';
import { PersonalityType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({
    description: '닉네임 변경 (1~20자). 미지정 시 변경 안 함.',
    example: '새닉네임',
    minLength: 1,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  name?: string;

  @ApiPropertyOptional({
    enum: PersonalityType,
    description: 'personality 변경. 화면엔 없지만 백엔드는 가능.',
  })
  @IsOptional()
  @IsEnum(PersonalityType)
  personality?: PersonalityType;
}
