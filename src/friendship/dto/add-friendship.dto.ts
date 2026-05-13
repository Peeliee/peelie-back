import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddFriendshipDto {
  @ApiProperty({
    description: '추가할 친구의 친구 코드 (영구).',
    example: 'abc12345',
    minLength: 1,
    maxLength: 20,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  friendCode!: string;
}
