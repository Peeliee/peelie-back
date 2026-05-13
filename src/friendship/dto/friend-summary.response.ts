import { ApiProperty } from '@nestjs/swagger';
import { PersonalityType } from '@prisma/client';

export class FriendSummary {
  @ApiProperty({ example: 'cmp...' })
  id!: string;

  @ApiProperty({ example: '지원' })
  name!: string;

  @ApiProperty({ enum: PersonalityType })
  personality!: PersonalityType;
}
