import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AppleAppLoginDto {
  @ApiProperty({
    description:
      'iOS 네이티브 앱이 Apple 로그인 후 받은 authorization code. 서버에서 .p8 로 서명한 client_secret + 이 code 로 Apple 토큰 엔드포인트 호출하여 id_token 검증 후 사용자 식별.',
    example: 'c4a4d2b3...',
  })
  @IsString()
  @IsNotEmpty()
  authorizationCode!: string;
}
