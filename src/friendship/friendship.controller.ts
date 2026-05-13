import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiOkResponseWrapped } from '../common/decorators/api-ok-response-wrapped.decorator';
import { ApiErrorResponseDto } from '../common/dto/api-response.dto';
import { AddFriendshipDto } from './dto/add-friendship.dto';
import { FriendSummary } from './dto/friend-summary.response';
import { FriendshipService } from './friendship.service';

@ApiTags('Friendship')
@ApiBearerAuth('access-token')
@Controller('friendships')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Get()
  @ApiOperation({ summary: '내 친구 목록 (createdAt desc)' })
  @ApiOkResponseWrapped(FriendSummary, { isArray: true })
  list(@CurrentUser() user: AuthUser): Promise<FriendSummary[]> {
    return this.friendshipService.findAllForUser(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'friendCode 로 친추 (단방향, 수락 플로우 없음)',
    description:
      '본인 코드 입력 시 400. 이미 추가된 친구는 409. 없는 코드는 404.',
  })
  @ApiOkResponseWrapped(FriendSummary, { status: 201 })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: '해당 friendCode 가진 user 없음',
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: '이미 추가된 친구',
  })
  add(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddFriendshipDto,
  ): Promise<FriendSummary> {
    return this.friendshipService.addByFriendCode(user.id, dto.friendCode);
  }
}
