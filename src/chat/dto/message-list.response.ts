import type { MessageResponse } from './message.response';

export interface MessageListResponse {
  // asc 순서 (오래된 메시지부터 → 화면 위에서 아래로)
  items: MessageResponse[];
  // 이 값을 다음 호출의 `?before=` 로 보내면 더 오래된 메시지 받음. null 이면 끝.
  nextCursor: string | null;
}
