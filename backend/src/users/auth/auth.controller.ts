import { Controller, Post, Body, Get, Req, Res, UseGuards, HttpCode } from '@nestjs/common';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  SendOtpDto,
  ForgotPasswordDto,
  VerifyResetOtpDto,
  ResetPasswordDto,
} from './auth.dto';
import {
  GoogleAuthGuard,
  FacebookAuthGuard,
  JwtRefreshGuard,
  JwtAccessGuard,
} from './auth.guard';
import { CurrentUser } from './auth.decorator';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

function parseExpiryToMs(value: string | undefined, fallbackMs: number): number {
  if (!value) return fallbackMs;
  const match = /^(\d+)([smhd])?$/.exec(value);
  if (!match) return fallbackMs;
  const num = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's':
      return num * 1000;
    case 'm':
      return num * 60 * 1000;
    case 'h':
      return num * 60 * 60 * 1000;
    case 'd':
      return num * 24 * 60 * 60 * 1000;
    default:
      return num * 1000;
  }
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: parseExpiryToMs(this.config.get<string>('jwt.accessExpiresIn'), 60 * 1000),
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: parseExpiryToMs(this.config.get<string>('jwt.refreshExpiresIn'), 60 * 1000),
    });
  }

  @Post('send-otp')
  @HttpCode(200)
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('verify-otp')
  @HttpCode(200)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('verify-reset-otp')
  @HttpCode(200)
  verifyResetOtp(@Body() dto: VerifyResetOtpDto) {
    return this.authService.verifyResetOtp(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateLocalUser(dto);
    const { accessToken, refreshToken } = await this.authService.issueTokens(user);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { message: 'Đăng nhập thành công', user: { id: user.id, email: user.email, full_name: user.full_name } };
  }

  // Lấy thông tin user hiện tại từ cookie access_token (JwtAccessGuard tự refresh
  // ngầm bằng refresh_token nếu access_token hết hạn). Trả 401 nếu phiên không hợp lệ.
  @UseGuards(JwtAccessGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return this.authService.getMe(user.sub);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = (req as any).user?.sub;
    if (userId) await this.authService.logout(userId);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { message: 'Đã đăng xuất' };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(200)
  async refresh(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.refreshTokens(user.sub, user.refreshToken);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { message: 'Đã làm mới token' };
  }

  // Google
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleAuth() {
  }

  @UseGuards(GoogleAuthGuard)
@Get('google/callback')
async googleCallback(@Req() req: Request, @Res() res: Response) {
  const profile = req.user as any;
  const user = await this.authService.validateOAuthUser(profile);
  const { accessToken, refreshToken } = await this.authService.issueTokens(user);
  this.setAuthCookies(res, accessToken, refreshToken);
  return res.redirect(this.config.get<string>('frontendUrl') as string);
}

  // Facebook
  @UseGuards(FacebookAuthGuard)
  @Get('facebook')
  facebookAuth() {}

  @UseGuards(FacebookAuthGuard)
  @Get('facebook/callback')
  async facebookCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as any;
    const user = await this.authService.validateOAuthUser(profile);
    const { accessToken, refreshToken } = await this.authService.issueTokens(user);
    this.setAuthCookies(res, accessToken, refreshToken);
    return res.redirect(this.config.get<string>('frontendUrl') as string);
  }
}