import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** 해당 라우트(또는 컨트롤러)는 MockAuthGuard/JwtAuthGuard 인증을 건너뜀 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
