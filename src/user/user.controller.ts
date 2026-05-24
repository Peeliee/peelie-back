import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

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

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '회원탈뢰 (soft delete)',
    description: [
      '본인 계정 탈뢰. 데이터는 보존되되 `deletedAt` 마킹.',
      '',
      '**동작**',
      '- Apple Account 에 refresh_token 이 저장돼 있으면 Apple Sign-in revoke 호출 (실패해도 무시)',
      '- `User.deletedAt = NOW()`',
      '- `User.friendCode` / `Account.providerUserId` 에 `__deleted__{timestamp}` suffix → UNIQUE 제약 해방',
      '',
      '**결과**',
      '- 같은 access token 으로 재호출 시 401 (JwtAuthGuard 가 deletedAt 체크)',
      '- 친구 입장에선 채팅방 / 약속 / 친구목록에 그대로 보이되 `friend.isWithdrawn: true`',
      '- 새 친구 추가 / 약속 등록 / 스트림은 차단됨',
      '- 같은 카카오/Apple 계정으로 재가입 가능 (새 User 생성)',
      '',
      '응답 wrap 미적용 (204 No Content).',
    ].join('\n'),
  })
  @ApiNoContentResponse()
  async deleteMe(@CurrentUser() user: AuthUser): Promise<void> {
    await this.userService.softDelete(user.id);
  }
}
