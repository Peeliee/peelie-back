import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { AddFriendshipDto } from './dto/add-friendship.dto';
import type { FriendSummary } from './dto/friend-summary.response';
import { FriendshipService } from './friendship.service';

@ApiTags('Friendship')
@ApiBearerAuth('access-token')
@Controller('friendships')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<FriendSummary[]> {
    return this.friendshipService.findAllForUser(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  add(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddFriendshipDto,
  ): Promise<FriendSummary> {
    return this.friendshipService.addByFriendCode(user.id, dto.friendCode);
  }
}
