import { openai } from '@ai-sdk/openai';
import { Injectable } from '@nestjs/common';
import { PersonalityType } from '@prisma/client';
import { generateObject, type ModelMessage } from 'ai';
import { z } from 'zod';

import { buildSystemPrompt } from './prompts/build-system-prompt';

const ChatTurnSchema = z.object({
  bubbles: z
    .array(
      z.object({
        text: z.string().min(1).max(120),
        delayMs: z.number().int().min(300).max(2500),
      }),
    )
    .min(1)
    .max(4),
  suggestions: z.array(z.string().min(1).max(12)).length(3),
});

export type ChatTurn = z.infer<typeof ChatTurnSchema>;

export interface ChatHistoryMessage {
  role: 'USER' | 'AVATAR';
  content: string;
}

export interface GenerateChatTurnInput {
  friendPersonality: PersonalityType;
  friendName: string;
  userName: string;
  scheduleDescription: string;
  daysUntilMeet: number;
  recentMessages: ChatHistoryMessage[];
  userMessage: string;
}

// 모델 한 군데서만 박음. 나중에 갈아끼울 때 이 줄만 수정.
const CHAT_MODEL = openai('gpt-4.1-mini');

// 첫 버블 1.5초 지연 (Q6 합의 — 카톡 친구처럼 "생각하는 척" 효과)
const FIRST_BUBBLE_DELAY_MS = 1500;

@Injectable()
export class LlmService {
  async generateChatTurn(input: GenerateChatTurnInput): Promise<ChatTurn> {
    const system = buildSystemPrompt(input);
    const messages: ModelMessage[] = [
      ...input.recentMessages.map<ModelMessage>((m) => ({
        role: m.role === 'USER' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: 'user', content: input.userMessage },
    ];

    const result = await generateObject({
      model: CHAT_MODEL,
      schema: ChatTurnSchema,
      system,
      messages,
    });

    return {
      bubbles: result.object.bubbles.map((b, idx) => ({
        ...b,
        delayMs: idx === 0 ? FIRST_BUBBLE_DELAY_MS : b.delayMs,
      })),
      suggestions: result.object.suggestions,
    };
  }

  /**
   * 선제 인사 (사용자가 채팅방 들어왔을 때 봇이 먼저 말 거는 상황).
   * generateChatTurn 을 재사용하되, userMessage 자리에 system instruction 박음.
   */
  async generateGreeting(
    input: Omit<GenerateChatTurnInput, 'userMessage'>,
  ): Promise<ChatTurn> {
    return this.generateChatTurn({
      ...input,
      userMessage:
        '[시스템 안내] 사용자가 방금 채팅방에 들어왔어. 최근 대화 흐름을 고려해서 자연스럽게 먼저 말을 걸어줘. 인사부터 시작해도 좋고, 약속 자리 얘기 꺼내도 좋아.',
    });
  }
}
