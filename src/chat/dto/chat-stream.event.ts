import { ApiProperty } from '@nestjs/swagger';

export class MessageBubbleDto {
  @ApiProperty({ example: '오랜만이다~ 잘 지냈어?', maxLength: 120 })
  text!: string;

  @ApiProperty({
    example: 1500,
    description: '이 버블을 보여주기 전 클라가 대기할 시간 (ms). 첫 버블은 1500 고정.',
    minimum: 0,
    maximum: 2500,
  })
  delayMs!: number;
}

export interface MessageBubble {
  text: string;
  delayMs: number;
}

export type ChatStreamEvent =
  | {
      event: 'meta';
      data: { chatRoomId: string; friendId: string; userId: string };
    }
  | { event: 'bubble'; data: MessageBubble }
  | { event: 'suggestions'; data: string[] }
  | { event: 'done'; data: { chatRoomId: string } }
  // greeting endpoint 에서 오늘 이미 인사한 경우 발사. bubble/suggestions 없이 즉시 종료.
  | { event: 'skip'; data: Record<string, never> }
  | { event: 'error'; data: { message: string } };
