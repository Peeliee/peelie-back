import { ApiProperty } from '@nestjs/swagger';

/**
 * 모든 성공 응답의 공통 wrapper schema.
 * `data` 필드는 endpoint 별로 ApiOkResponseWrapped 헬퍼가 schema 에 박는다 (allOf + ref).
 * → 여기선 generic 제거 + data 필드 정의 안 함 (Swagger circular reference 회피)
 */
export class ApiSuccessResponseDto {
  @ApiProperty({ example: 200 })
  status!: number;

  @ApiProperty({ example: true, enum: [true] })
  success!: true;

  @ApiProperty({ example: 'OK' })
  message!: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400 })
  status!: number;

  @ApiProperty({ example: false, enum: [false] })
  success!: false;

  @ApiProperty({
    example: 'name must be shorter than or equal to 20 characters',
    description: '클라이언트에 보여줄 수 있는 짧은 에러 메시지',
  })
  message!: string;

  @ApiProperty({
    example: 'BAD_REQUEST',
    description:
      'HTTP status text 를 SNAKE_CASE 로 매핑 (BAD_REQUEST / NOT_FOUND / CONFLICT ...)',
  })
  code!: string;

  @ApiProperty({
    example: 'name must be shorter than or equal to 20 characters',
    description:
      '디버깅용 상세 사유. class-validator 다중 메시지는 "; " 으로 join',
  })
  reason!: string;
}

export interface ApiSuccessResponse<T> {
  status: number;
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  status: number;
  success: false;
  message: string;
  code: string;
  reason: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
