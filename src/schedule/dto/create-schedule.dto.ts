import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  friendUserId!: string;

  // YYYY-MM-DD (년/월/일). 시간 없음.
  @IsDateString({ strict: true })
  meetDate!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;
}
