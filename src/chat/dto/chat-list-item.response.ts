import { ApiProperty } from '@nestjs/swagger';
import { PersonalityType } from '@prisma/client';

export class ChatListFriendDto {
  @ApiProperty({ example: 'cmp...' })
  id!: string;

  @ApiProperty({ example: '김나은' })
  name!: string;

  @ApiProperty({ enum: PersonalityType })
  personality!: PersonalityType;
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
    example: '그럼 너는 쉬는 시간에 주로 OTT 보는 편이야? 영화 같이 ...',
    description:
      '마지막 메시지 미리보기. 메시지의 bubbles 텍스트들을 " " 으로 join 후 60자로 자름 (...). 메시지 없으면 null.',
  })
  lastMessagePreview!: string | null;

  @ApiProperty({
    description:
      '마지막 메시지 createdAt > lastReadAt 이면 true. lastReadAt 은 채팅방 진입 부수효과 또는 명시적 /read 호출로 갱신.',
  })
  isUnread!: boolean;
}
