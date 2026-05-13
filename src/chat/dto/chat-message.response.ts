import type { MessageRole } from '@prisma/client';

export interface ChatBubblePayload {
  text: string;
  delayMs: number;
}

export interface ChatMessageResponse {
  id: string;
  role: MessageRole;
  bubbles: ChatBubblePayload[];
  suggestions: string[];
  createdAt: Date;
}
