import { ApiProperty } from '@nestjs/swagger';
import { PersonalityType } from '@prisma/client';

export class FriendSummary {
  @ApiProperty({ example: 'cmp...' })
  id!: string;

  @ApiProperty({ example: '지원' })
  name!: string;

  @ApiProperty({ enum: PersonalityType })
  personality!: PersonalityType;

  @ApiProperty({
    description: '탈뢰한 사용자면 true. 프론트가 "탈뢰한 사용자" 표시.',
    example: false,
  })
  isWithdrawn!: boolean;
}
