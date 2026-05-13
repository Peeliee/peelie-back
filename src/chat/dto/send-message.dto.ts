import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: '사용자가 보낼 메시지 텍스트.',
    example: '안녕 오랜만이야',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message!: string;
}
