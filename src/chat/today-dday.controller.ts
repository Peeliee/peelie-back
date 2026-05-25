import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiOkResponseWrapped } from '../common/decorators/api-ok-response-wrapped.decorator';
import { DDaySummaryService } from './dday-summary.service';
import { TodayDDayItem } from './dto/today-dday.response';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@Controller('today-dday')
export class TodayDDayController {
  constructor(private readonly ddaySummaryService: DDaySummaryService) {}

  @Get()
  @ApiOperation({
    summary: '오늘 D-day 인 약속 + 대화 요약',
    description: [
      '프론트가 앱 진입 시 호출. KST 오늘 = `schedule.meetDate` 인 본인 약속들 반환.',
      '',
      '**요약 생성 시점**: KST 매일 06:00 cron 으로 1회. 그 이전에 호출하면 `summary: null`.',
      '',
      '**프론트 처리**',
      '- 빈 배열 → 모달 X',
      '- `summary` 있음 → 그대로 표시',
      '- `summary: null` → fallback 멘트 (예: "오늘 약속이 있어요!")',
      '- "오늘 한 번 본 모달" 처리는 클라 localStorage 로 (백엔드 추적 X)',
    ].join('\n'),
  })
  @ApiOkResponseWrapped(TodayDDayItem, { isArray: true })
  list(@CurrentUser() user: AuthUser): Promise<TodayDDayItem[]> {
    return this.ddaySummaryService.findTodayDDayForUser(user.id);
  }
}
