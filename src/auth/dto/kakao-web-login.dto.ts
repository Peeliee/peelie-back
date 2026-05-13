import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class KakaoWebLoginDto {
  @ApiProperty({
    description:
      '카카오 인증 후 redirect_uri 로 받은 authorization code (query: ?code=...)',
    example: 'abc...xyz',
  })
  @IsString()
  @MinLength(1)
  code!: string;
}
