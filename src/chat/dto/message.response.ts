import { ApiProperty } from '@nestjs/swagger';
import { MessageRole } from '@prisma/client';

import { MessageBubbleDto } from './chat-stream.event';

export class MessageResponse {
  @ApiProperty({ example: 'cmp...' })
  id!: string;

  @ApiProperty({ enum: MessageRole })
  role!: MessageRole;

  @ApiProperty({
    type: [MessageBubbleDto],
    description: 'USER: 1개 (delayMs=0). AVATAR: 1~4개 (멀티 버블).',
  })
  bubbles!: MessageBubbleDto[];

  @ApiProperty({
    type: [String],
    description: 'AVATAR 메시지만 3개. USER 는 빈 배열.',
    example: ['응 좋아!', '안 갈래', '왜?'],
  })
  suggestions!: string[];

  @ApiProperty({ example: '2026-05-13T03:52:35.610Z' })
  createdAt!: Date;
}
