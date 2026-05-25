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
    .max(3),
  suggestions: z.array(z.string().min(1).max(30)).length(3),
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

  /**
   * D-day 모달용 대화 요약.
   * 약속 당일 06:00 KST 에 cron 으로 1회 호출. 60자 ±10.
   * 대화가 없으면 친근한 fallback 멘트.
   */
  async summarizeConversation(input: SummaryInput): Promise<string> {
    const system = buildSummarySystemPrompt(input);
    const userPrompt =
      input.messages.length === 0
        ? `[시스템 안내] 그동안 사용자(${input.userName})와 ${input.friendName} 사이에 나눈 대화가 없어. 그래도 오늘 약속을 응원하는 친근한 한 줄 멘트를 만들어줘.`
        : `[시스템 안내] 위 대화를 한 줄로 요약해줘.\n전체 대화:\n${input.messages
            .map(
              (m) =>
                `${m.role === 'USER' ? input.userName : input.friendName}: ${m.content}`,
            )
            .join('\n')}`;

    const result = await generateObject({
      model: CHAT_MODEL,
      schema: SummarySchema,
      system,
      prompt: userPrompt,
      maxRetries: 3,
    });
    return result.object.summary;
  }
}

const SummarySchema = z.object({
  summary: z.string().min(20).max(80),
});

export interface SummaryInput {
  friendPersonality: PersonalityType;
  friendName: string;
  userName: string;
  scheduleDescription: string;
  messages: ChatHistoryMessage[];
}

function buildSummarySystemPrompt(input: SummaryInput): string {
  return `너는 두 친구의 만남을 응원하는 친근한 어시스턴트야.

## 약속 정보
- 사용자: ${input.userName}
- 친구: ${input.friendName} (성격: ${input.friendPersonality})
- 만남 자리: "${input.scheduleDescription}"
- 오늘이 약속 당일

## 요약 규칙
- 공백 포함 50~70자 정도 (한두 문장)
- 사용자 입장에서 "이 친구와의 대화를 한눈에 떠올릴 수 있게"
- 그동안 대화의 핵심 키워드 / 공통 관심사 / 흐름 짚어줌
- 가능하면 "오늘 만남에서 이런 얘기 꺼내보면 좋겠다" 같은 제안 한 마디 추가
- 호칭: 사용자 / 친구 둘 다 "{이름}님" 으로
- 한국어, 친근한 톤. 이모지 X.

## 대화 없는 경우
- "{친구이름}님과 아직 나눈 대화가 없네요. 그래도 즐거운 시간 보내요!" 같은 톤으로 60자 정도.`;
}
