import { ApiProperty } from '@nestjs/swagger';
import { PersonalityType } from '@prisma/client';

export class ChatListFriendDto {
  @ApiProperty({ example: 'cmp...' })
  id!: string;

  @ApiProperty({ example: '김나은' })
  name!: string;

  @ApiProperty({ enum: PersonalityType })
  personality!: PersonalityType;

  @ApiProperty({
    description: '탈뢰한 사용자면 true.',
    example: false,
  })
  isWithdrawn!: boolean;

  @ApiProperty({
    description:
      '현재 내 친구 목록에 있으면 true. 친구 삭제하면 false (채팅방은 그대로 보이되 새 대화 불가).',
    example: true,
  })
  isFriend!: boolean;
}

export class ChatListItem {
  @ApiProperty({ example: 'cmp...' })
  chatRoomId!: string;

  @ApiProperty({ type: ChatListFriendDto })
  friend!: ChatListFriendDto;

  @ApiProperty({
    example: '2026-05-13T03:52:35.610Z',
    description:
      '마지막 메시지 시각. 메시지 없으면 chatRoom.createdAt fallback.',
  })
  lastMessageAt!: Date;

  @ApiProperty({
    nullable: true,
    example: '비포 선라이즈 느낌도 나고~',
    description:
      '마지막 메시지의 마지막 버블 텍스트 (60자 초과 시 ... 로 자름). 메시지 없으면 null.',
  })
  lastMessagePreview!: string | null;

  @ApiProperty({
    description:
      '마지막 메시지 createdAt > lastReadAt 이면 true. lastReadAt 은 채팅방 진입 부수효과 또는 명시적 /read 호출로 갱신.',
  })
  isUnread!: boolean;
}
