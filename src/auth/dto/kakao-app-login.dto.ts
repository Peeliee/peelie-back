import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class KakaoAppLoginDto {
  @ApiProperty({
    description:
      '네이티브 앱(iOS/Android) 의 카카오 SDK 로그인으로 받은 access token. 서버가 이 토큰으로 kapi.kakao.com 호출하여 사용자 식별.',
    example: 'B2zYy...',
  })
  @IsString()
  @IsNotEmpty()
  accessToken!: string;
}
