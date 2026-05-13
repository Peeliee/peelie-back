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
