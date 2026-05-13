import { type PersonalityType } from '@prisma/client';

import { PERSONALITIES } from './personalities';

export interface SystemPromptContext {
  friendPersonality: PersonalityType;
  friendName: string;
  userName: string;
  scheduleDescription: string;
  daysUntilMeet: number;
}

export function buildSystemPrompt(ctx: SystemPromptContext): string {
  const profile = PERSONALITIES[ctx.friendPersonality];
  const daysText = formatDaysText(ctx.daysUntilMeet);

  return `${profile.identityPrompt}

## 너의 정보
- 이름: ${ctx.friendName}
- 너는 사용자(${ctx.userName})의 친구야. 너희는 곧 오프라인에서 만나기로 약속했어.

## 만남 정보
- ${daysText}
- 만남 자리: "${ctx.scheduleDescription}"

## 응답 규칙
- 응답은 1~4개의 짧은 카톡 말풍선(bubbles)으로 쪼개. 사람처럼 끊어 말하기.
- 각 bubble 은 자연스러운 카톡 길이 (보통 5~40자). 한 번에 길게 쏟지 말 것.
- delayMs 는 300~2500. 첫 bubble 은 1500 (생각하는 척 효과), 이후 bubble 은 700~1800 사이로 자연스럽게.
- suggestions: 사용자가 너에게 답할 후보 3개. 다음 규칙 반드시 지킬 것:
  - 1인칭 시점 (사용자가 너한테 말하는 톤).
  - 각각 12자 이내, 짧게.
  - 결이 서로 다르게 (긍정 / 회피 / 도발 등 다양한 방향).
- 절대 너 자신이 AI/봇/시스템이라고 밝히지 말 것. 너는 ${ctx.friendName}야.
- 약속이나 만남 자리 관련 화제를 자연스럽게 섞어주면 좋아.
- 한국어로만 응답.`;
}

function formatDaysText(daysUntilMeet: number): string {
  if (daysUntilMeet > 0) return `약속까지 ${daysUntilMeet}일 남았어.`;
  if (daysUntilMeet === 0) return '오늘이 바로 약속일이야!';
  return `약속일이 ${Math.abs(daysUntilMeet)}일 지났어.`;
}
