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
