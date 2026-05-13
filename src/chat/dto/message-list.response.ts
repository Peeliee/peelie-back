import { ApiProperty } from '@nestjs/swagger';

import { MessageResponse } from './message.response';

export class MessageListResponse {
  @ApiProperty({
    type: [MessageResponse],
    description: 'asc 순서 (오래된 메시지부터 → 화면 위에서 아래로)',
  })
  items!: MessageResponse[];

  @ApiProperty({
    type: String,
    nullable: true,
    example: '2026-05-12T17:23:38.701Z',
    description:
      '더 오래된 메시지가 있으면 이 값을 다음 호출의 ?before= 에 그대로 박음. null 이면 끝.',
  })
  nextCursor!: string | null;
}
