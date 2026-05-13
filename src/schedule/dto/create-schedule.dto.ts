import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({
    description: '친구로 등록된 user 의 id (cuid). 본인의 Friendship 에 있어야 함.',
    example: 'cmp...',
  })
  @IsString()
  friendUserId!: string;

  @ApiProperty({
    description: '만남 일자. YYYY-MM-DD 형식 ISO date string.',
    example: '2026-06-15',
  })
  @IsDateString({ strict: true })
  meetDate!: string;

  @ApiProperty({
    description: '만남 자리 설명. LLM 컨텍스트로 챗봇에 주입됨.',
    example: '비포 선라이즈 같이 보기',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;
}
