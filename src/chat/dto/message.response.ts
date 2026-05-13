import type { MessageRole } from '@prisma/client';

import type { MessageBubble } from './chat-stream.event';

export interface MessageResponse {
  id: string;
  role: MessageRole;
  bubbles: MessageBubble[];
  suggestions: string[];
  createdAt: Date;
}
