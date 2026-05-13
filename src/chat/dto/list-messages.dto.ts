import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListMessagesDto {
  @ApiPropertyOptional({
    description: '이 시각 "이전" 메시지를 limit 개수만큼 반환. 무한스크롤 cursor.',
    example: '2026-05-13T03:52:35.610Z',
  })
  @IsOptional()
  @IsDateString()
  before?: string;

  @ApiPropertyOptional({
    description: '한 페이지 크기. default 30, max 100.',
    minimum: 1,
    maximum: 100,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
