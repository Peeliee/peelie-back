import { ApiProperty } from '@nestjs/swagger';
import { PersonalityType } from '@prisma/client';

export class ScheduleFriendDto {
  @ApiProperty({ example: 'cmp...' })
  id!: string;

  @ApiProperty({ example: '지원' })
  name!: string;

  @ApiProperty({ enum: PersonalityType })
  personality!: PersonalityType;
}

export class ScheduleChatRoomDto {
  @ApiProperty({ example: 'cmp...', description: '연결된 채팅방 id' })
  id!: string;
}

export class ScheduleResponse {
  @ApiProperty({ example: 'cmp...' })
  id!: string;

  @ApiProperty({
    example: '2026-06-15T00:00:00.000Z',
    description: '만남 일자 (YYYY-MM-DD 가 자정 UTC 로 저장됨)',
  })
  meetDate!: Date;

  @ApiProperty({ example: '비포 선라이즈 같이 보기로 약속함', maxLength: 200 })
  description!: string;

  @ApiProperty({ example: '2026-05-13T03:52:35.610Z' })
  createdAt!: Date;

  @ApiProperty({ type: ScheduleFriendDto })
  friendUser!: ScheduleFriendDto;

  @ApiProperty({ type: ScheduleChatRoomDto })
  chatRoom!: ScheduleChatRoomDto;
}
