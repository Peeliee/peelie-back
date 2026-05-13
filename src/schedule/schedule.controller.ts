import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';

import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import type { ScheduleResponse } from './dto/schedule.response';
import { ScheduleService } from './schedule.service';

@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<ScheduleResponse[]> {
    return this.scheduleService.findAllForUser(user.id);
  }

  @Get(':id')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ScheduleResponse> {
    return this.scheduleService.findOneForUser(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateScheduleDto,
  ): Promise<ScheduleResponse> {
    return this.scheduleService.create(user.id, dto);
  }
}
