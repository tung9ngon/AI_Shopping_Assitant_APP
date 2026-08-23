import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ROLES_KEY } from './auth.decorator';
import { AuthService } from './auth.service';

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

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    try {
      // Đường đi bình thường: access_token còn hạn -> passport-jwt xác thực OK
      return (await super.canActivate(context)) as boolean;
    } catch (err) {
      // access_token thiếu / sai / hết hạn -> thử refresh ngầm bằng refresh_token
      const refreshToken = request.cookies?.refresh_token;
      if (!refreshToken) throw err;

      let payload: { sub: string };
      try {
        payload = this.jwtService.verify(refreshToken, {
          secret: this.config.get<string>('jwt.refreshSecret') as string,
        });
      } catch {
        // refresh_token cũng sai/hết hạn -> bắt đăng nhập lại
        throw err;
      }

      try {
        const { accessToken, refreshToken: newRefreshToken } =
          await this.authService.refreshTokens(payload.sub, refreshToken);

        response.cookie('access_token', accessToken, {
          ...COOKIE_OPTIONS,
          maxAge: parseExpiryToMs(this.config.get<string>('jwt.accessExpiresIn'), 15 * 60 * 1000),
        });
        response.cookie('refresh_token', newRefreshToken, {
          ...COOKIE_OPTIONS,
          maxAge: parseExpiryToMs(this.config.get<string>('jwt.refreshExpiresIn'), 7 * 24 * 60 * 60 * 1000),
        });

        // Gắn user vào request để controller/handler phía sau dùng như bình thường
        request.user = this.jwtService.decode(accessToken);
        return true;
      } catch {
        // refresh_token hợp lệ nhưng không khớp bản lưu ở Redis
        // (đã logout / đã bị thu hồi / đã refresh ở nơi khác) -> bắt đăng nhập lại
        throw err;
      }
    }
  }
}

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}

// Dùng cho route cho phép cả guest lẫn user đăng nhập (vd /conversations).
// Có token hợp lệ -> gắn request.user. Token thiếu/sai/hết hạn (kể cả refresh
// cũng fail) -> KHÔNG chặn request, coi như guest (request.user = null).
// Controller/service tự quyết định logic khác nhau giữa guest và user.
@Injectable()
export class OptionalJwtAccessGuard extends AuthGuard('jwt-access') {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      const refreshToken = request.cookies?.refresh_token;
      if (!refreshToken) {
        request.user = undefined;
        return true; // guest
      }

      try {
        const payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
          secret: this.config.get<string>('jwt.refreshSecret') as string,
        });

        const { accessToken, refreshToken: newRefreshToken } =
          await this.authService.refreshTokens(payload.sub, refreshToken);

        response.cookie('access_token', accessToken, {
          ...COOKIE_OPTIONS,
          maxAge: parseExpiryToMs(this.config.get<string>('jwt.accessExpiresIn'), 15 * 60 * 1000),
        });
        response.cookie('refresh_token', newRefreshToken, {
          ...COOKIE_OPTIONS,
          maxAge: parseExpiryToMs(this.config.get<string>('jwt.refreshExpiresIn'), 7 * 24 * 60 * 60 * 1000),
        });

        request.user = this.jwtService.decode(accessToken);
      } catch {
        // refresh cũng fail -> vẫn không chặn, coi như guest
        request.user = undefined;
      }
      return true;
    }
  }
}

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}

@Injectable()
export class FacebookAuthGuard extends AuthGuard('facebook') {
  constructor() {
    super({ scope: ['email'] });
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}