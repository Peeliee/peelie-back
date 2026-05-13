import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export type ChatRoomListSort = 'recent' | 'stale';

const CHAT_ROOM_SORT_VALUES = ['recent', 'stale'] as const;

export class ListChatRoomsDto {
  @ApiPropertyOptional({
    enum: CHAT_ROOM_SORT_VALUES,
    default: 'recent',
    description:
      '정렬 기준. recent: 최근 메시지 desc (default). stale: 오래 안 한 순 asc.',
  })
  @IsOptional()
  @IsIn(CHAT_ROOM_SORT_VALUES)
  sort?: ChatRoomListSort;
}
