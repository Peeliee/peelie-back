import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiOkResponseWrapped } from '../common/decorators/api-ok-response-wrapped.decorator';
import { MeResponse } from './dto/me.response';
import { UpdateMeDto } from './dto/update-me.dto';
import { UserService } from './user.service';

@ApiTags('User')
@ApiBearerAuth('access-token')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiOkResponseWrapped(MeResponse, {
    description: '내 정보 (friendCode 포함)',
  })
  getMe(@CurrentUser() user: AuthUser): Promise<MeResponse> {
    return this.userService.findById(user.id);
  }

  @Patch('me')
  @ApiOperation({
    summary: '내 프로필 수정',
    description: '닉네임 / personality 변경. 둘 다 optional.',
  })
  @ApiOkResponseWrapped(MeResponse)
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMeDto,
  ): Promise<MeResponse> {
    return this.userService.updateMe(user.id, dto);
  }
}
