import { ApiProperty } from '@nestjs/swagger';
import { PersonalityType } from '@prisma/client';

export class MeResponse {
  @ApiProperty({ example: 'cmp...', description: '내부 user id (cuid)' })
  id!: string;

  @ApiProperty({ example: '지원', description: '닉네임' })
  name!: string;

  @ApiProperty({ enum: PersonalityType })
  personality!: PersonalityType;

  @ApiProperty({ example: 'abc12345', description: '영구 친구 코드' })
  friendCode!: string;

  @ApiProperty({ example: '2026-05-13T03:52:35.610Z' })
  createdAt!: Date;
}
