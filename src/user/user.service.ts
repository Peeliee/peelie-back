import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { MeResponse } from './dto/me.response';
import type { UpdateMeDto } from './dto/update-me.dto';

const ME_SELECT = {
  id: true,
  name: true,
  personality: true,
  friendCode: true,
  createdAt: true,
} as const;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: ME_SELECT,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<MeResponse> {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: ME_SELECT,
    });
  }
}
