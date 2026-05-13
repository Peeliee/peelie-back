import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiOkResponseWrapped } from '../common/decorators/api-ok-response-wrapped.decorator';
import { ApiErrorResponseDto } from '../common/dto/api-response.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleResponse } from './dto/schedule.response';
import { ScheduleService } from './schedule.service';

@ApiTags('Schedule')
@ApiBearerAuth('access-token')
@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  @ApiOperation({
    summary: '내 일정 목록 (meetDate desc, 과거 + 미래 모두)',
  })
  @ApiOkResponseWrapped(ScheduleResponse, { isArray: true })
  list(@CurrentUser() user: AuthUser): Promise<ScheduleResponse[]> {
    return this.scheduleService.findAllForUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '일정 단건 (chatRoom.id 포함)' })
  @ApiOkResponseWrapped(ScheduleResponse)
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: '본인 소유 일정이 없음',
  })
  detail(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ScheduleResponse> {
    return this.scheduleService.findOneForUser(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '일정 등록 (ChatRoom 자동 생성)',
    description:
      'friendUserId 는 본인의 Friendship 에 있어야 함. 트랜잭션으로 Schedule + ChatRoom 동시 INSERT.',
  })
  @ApiOkResponseWrapped(ScheduleResponse, { status: 201 })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: '본인과의 일정 / 친구 목록에 없는 유저 / 입력 검증 실패',
  })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateScheduleDto,
  ): Promise<ScheduleResponse> {
    return this.scheduleService.create(user.id, dto);
  }
}
