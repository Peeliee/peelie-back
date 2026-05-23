import { ApiProperty } from '@nestjs/swagger';
import { PersonalityType } from '@prisma/client';

export class ChatRoomListFriendDto {
  @ApiProperty({ example: 'cmp...' })
  id!: string;

  @ApiProperty({ example: '지원' })
  name!: string;

  @ApiProperty({ enum: PersonalityType })
  personality!: PersonalityType;
}

export class ChatRoomListItem {
  @ApiProperty({ example: 'cmp...' })
  chatRoomId!: string;

  @ApiProperty({ type: ChatRoomListFriendDto })
  friend!: ChatRoomListFriendDto;

  @ApiProperty({ example: '2026-04-19T00:00:00.000Z' })
  meetDate!: Date;

  @ApiProperty({
    description: '약속 등록 시각 (Schedule.createdAt).',
    example: '2026-04-10T12:34:56.789Z',
  })
  registeredAt!: Date;

  @ApiProperty({
    description:
      '채팅방 마지막 메시지 시각. 메시지 없으면 chatRoom.createdAt fallback.',
    example: '2026-05-13T03:52:35.610Z',
  })
  lastMessageAt!: Date;
}
