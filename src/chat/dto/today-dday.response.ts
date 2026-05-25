import { ApiProperty } from '@nestjs/swagger';
import { PersonalityType } from '@prisma/client';

export class TodayDDayFriendDto {
  @ApiProperty({ example: 'cmp...' })
  id!: string;

  @ApiProperty({ example: '지원' })
  name!: string;

  @ApiProperty({ enum: PersonalityType })
  personality!: PersonalityType;
}

export class TodayDDayItem {
  @ApiProperty({ example: 'cmp...' })
  scheduleId!: string;

  @ApiProperty({ example: 'cmp...' })
  chatRoomId!: string;

  @ApiProperty({ type: TodayDDayFriendDto })
  friend!: TodayDDayFriendDto;

  @ApiProperty({ example: '2026-05-25T00:00:00.000Z' })
  meetDate!: Date;

  @ApiProperty({ example: '강남 카페에서 사이드 프로젝트 같이 코딩하기' })
  description!: string;

  @ApiProperty({
    nullable: true,
    example:
      '지원님과 나은님은 모두 인천 맛집에 대한 관심이 많아요! 오늘은 맛집 공유로 시작해보세요.',
    description:
      '대화 요약 (60자 ±10). KST 06:00 cron 으로 생성. null 이면 cron 아직 안 돌았거나 LLM 실패 → 프론트 fallback 표시.',
  })
  summary!: string | null;
}
