import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export type ScheduleFilter = 'upcoming' | 'past' | 'all';
export type ScheduleOrder = 'asc' | 'desc';

const SCHEDULE_FILTER_VALUES = ['upcoming', 'past', 'all'] as const;
const SCHEDULE_ORDER_VALUES = ['asc', 'desc'] as const;

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

  @ApiPropertyOptional({
    enum: SCHEDULE_ORDER_VALUES,
    default: 'desc',
    description:
      'meetDate 정렬. desc (default): 최신 약속이 위. asc: 오래된 약속이 위.',
  })
  @IsOptional()
  @IsIn(SCHEDULE_ORDER_VALUES)
  order?: ScheduleOrder;
}
