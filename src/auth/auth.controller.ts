import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { CurrentSignupContext } from './current-signup-context.decorator';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { IssueSignupTokenDto } from './dto/issue-signup-token.dto';
import type {
  CompleteOnboardingResponse,
  IssueSignupTokenResponse,
} from './dto/auth.response';
import { Public } from './public.decorator';
import type { SignupContext } from './signup-context';
import { SignupTokenGuard } from './signup-token.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * dev-only 임시 입구.
   * 진짜 카카오/Apple OAuth 붙으면 `/auth/kakao/app`, `/auth/apple/app` 등으로 분기되고
   * 이 endpoint 는 prod 빌드에서 제거.
   */
  @Public()
  @Post('dev/signup-token')
  @HttpCode(HttpStatus.OK)
  issueSignupToken(
    @Body() dto: IssueSignupTokenDto,
  ): Promise<IssueSignupTokenResponse> {
    return this.authService.issueByProvider(dto.provider, dto.providerUserId);
  }

  @Public()
  @UseGuards(SignupTokenGuard)
  @Post('onboarding/complete')
  @HttpCode(HttpStatus.CREATED)
  completeOnboarding(
    @CurrentSignupContext() ctx: SignupContext,
    @Body() dto: CompleteOnboardingDto,
  ): Promise<CompleteOnboardingResponse> {
    return this.authService.completeOnboarding(
      ctx,
      dto.nickname,
      dto.personality,
    );
  }
}
