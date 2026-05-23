import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export type ScheduleFilter = 'upcoming' | 'past' | 'all';

const SCHEDULE_FILTER_VALUES = ['upcoming', 'past', 'all'] as const;

export class ListSchedulesDto {
  @ApiPropertyOptional({
    enum: SCHEDULE_FILTER_VALUES,
    default: 'upcoming',
    description:
      '날짜 필터 (KST 오늘 자정 기준). ' +
      'upcoming (default): 오늘 + 미래 약속. ' +
      'past: 어제까지의 약속. ' +
      'all: 전체.',
  })
  @IsOptional()
  @IsIn(SCHEDULE_FILTER_VALUES)
  filter?: ScheduleFilter;
}
