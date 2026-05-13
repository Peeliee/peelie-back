import { Body, Controller, Get, Patch } from '@nestjs/common';

import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import type { MeResponse } from './dto/me.response';
import { UpdateMeDto } from './dto/update-me.dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthUser): Promise<MeResponse> {
    return this.userService.findById(user.id);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMeDto,
  ): Promise<MeResponse> {
    return this.userService.updateMe(user.id, dto);
  }
}
