import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/user.entity';
import { RedisService } from '../../config/redis';
import { MailService } from '../../config/mail';
import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  SendOtpDto,
  ForgotPasswordDto,
  VerifyResetOtpDto,
  ResetPasswordDto,
} from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    private config: ConfigService,
    private redis: RedisService,
    private mail: MailService,
  ) {}

  // ---------- OTP ----------
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private otpKey(email: string) {
    return `otp:${email}`;
  }

  private verifiedKey(email: string) {
    return `email_verified:${email}`;
  }

  // ---------- Reset password (namespace riêng, tránh đụng OTP đăng ký) ----------
  private resetOtpKey(email: string) {
    return `reset_otp:${email}`;
  }

  private resetVerifiedKey(email: string) {
    return `reset_verified:${email}`;
  }

  async sendOtp(dto: SendOtpDto) {
    const existed = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existed) throw new ConflictException('Email đã được đăng ký');

    const otp = this.generateOtp();
    await this.redis.set(this.otpKey(dto.email), otp, 300); // TTL 5 phút
    await this.mail.sendOtp(dto.email, otp);
    return { message: 'Đã gửi OTP, vui lòng kiểm tra email' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const savedOtp = await this.redis.get(this.otpKey(dto.email));
    if (!savedOtp || savedOtp !== dto.otp) {
      throw new BadRequestException('OTP không đúng hoặc đã hết hạn');
    }
    await this.redis.del(this.otpKey(dto.email));
    // Đánh dấu email đã verify, cho phép đăng ký trong 10 phút tới
    await this.redis.set(this.verifiedKey(dto.email), '1', 600);
    return { message: 'Xác thực email thành công, vui lòng đặt mật khẩu' };
  }

  // ---------- Đăng ký (chỉ cho phép sau khi email đã verify) ----------
  async register(dto: RegisterDto) {
    const isVerified = await this.redis.get(this.verifiedKey(dto.email));
    if (!isVerified) {
      throw new BadRequestException('Email chưa xác thực OTP hoặc đã hết hạn, vui lòng xác thực lại');
    }

    const existed = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existed) throw new ConflictException('Email đã được sử dụng');

    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email,
      password_hash,
      full_name: dto.full_name,
      auth_provider: 'local',
      is_verified: true, // đã verify OTP ở bước trước
    });
    await this.userRepo.save(user);
    await this.redis.del(this.verifiedKey(dto.email));

    return { message: 'Đăng ký thành công, có thể đăng nhập ngay' };
  }

  // Trả thông tin user hiện tại cho FE (thay cho việc FE tự đọc cookie httpOnly).
  async getMe(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Phiên không hợp lệ');
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      avatar_url: user.avatar_url,
    };
  }

  async validateLocalUser(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user || !user.password_hash) throw new UnauthorizedException('Sai email hoặc mật khẩu');

    const match = await bcrypt.compare(dto.password, user.password_hash);
    if (!match) throw new UnauthorizedException('Sai email hoặc mật khẩu');

    return user;
  }

  // ---------- Quên mật khẩu ----------
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    // Không tiết lộ email có tồn tại hay không để tránh lộ thông tin tài khoản
    if (!user) {
      return { message: 'Nếu email tồn tại, mã OTP đã được gửi' };
    }
    if (user.auth_provider !== 'local') {
      // Tài khoản đăng nhập bằng Google/Facebook thì không có mật khẩu để reset
      return { message: 'Nếu email tồn tại, mã OTP đã được gửi' };
    }

    const otp = this.generateOtp();
    await this.redis.set(this.resetOtpKey(dto.email), otp, 300); // TTL 5 phút
    await this.mail.sendOtp(dto.email, otp);
    return { message: 'Nếu email tồn tại, mã OTP đã được gửi' };
  }

  async verifyResetOtp(dto: VerifyResetOtpDto) {
    const savedOtp = await this.redis.get(this.resetOtpKey(dto.email));
    if (!savedOtp || savedOtp !== dto.otp) {
      throw new BadRequestException('OTP không đúng hoặc đã hết hạn');
    }
    await this.redis.del(this.resetOtpKey(dto.email));
    // Cho phép đặt mật khẩu mới trong 10 phút tới
    await this.redis.set(this.resetVerifiedKey(dto.email), '1', 600);
    return { message: 'Xác thực OTP thành công, vui lòng đặt mật khẩu mới' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const isVerified = await this.redis.get(this.resetVerifiedKey(dto.email));
    if (!isVerified) {
      throw new BadRequestException('Bạn chưa xác thực OTP hoặc đã hết hạn, vui lòng thực hiện lại');
    }

    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new BadRequestException('Tài khoản không tồn tại');

    user.password_hash = await bcrypt.hash(dto.new_password, 10);
    await this.userRepo.save(user);
    await this.redis.del(this.resetVerifiedKey(dto.email));

    // Đăng xuất khỏi mọi thiết bị: huỷ refresh token hiện tại
    await this.redis.del(`refresh:${user.id}`);

    return { message: 'Đặt lại mật khẩu thành công, vui lòng đăng nhập lại' };
  }

  // ---------- OAuth ----------
  async validateOAuthUser(profile: {
    provider: 'google' | 'facebook';
    provider_id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
  }) {
    let user = await this.userRepo.findOne({ where: { email: profile.email } });

    if (!user) {
      user = this.userRepo.create({
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url || null,
        auth_provider: profile.provider,
        provider_id: profile.provider_id,
        is_verified: true,
      });
      await this.userRepo.save(user);
    }

    return user;
  }

  // ---------- Token ----------
  async issueTokens(user: User) {
    const payload = { sub: user.id, email: user.email as string, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.accessSecret') as string,
      expiresIn: this.config.get<string>('jwt.accessExpiresIn') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.refreshSecret') as string,
      expiresIn: this.config.get<string>('jwt.refreshExpiresIn') as any,
    });

    const ttlSeconds = this.parseExpiryToSeconds(
      this.config.get<string>('jwt.refreshExpiresIn') as string,
    );
    await this.redis.set(`refresh:${user.id}`, refreshToken, ttlSeconds);

    return { accessToken, refreshToken };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const saved = await this.redis.get(`refresh:${userId}`);
    if (!saved || saved !== refreshToken) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.issueTokens(user);
  }

  async logout(userId: string) {
    await this.redis.del(`refresh:${userId}`);
  }

  private parseExpiryToSeconds(value: string): number {
    const match = /^(\d+)([smhd])?$/.exec(value);
    if (!match) return 3600;
    const num = Number(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's': return num;
      case 'm': return num * 60;
      case 'h': return num * 3600;
      case 'd': return num * 86400;
      default: return num;
    }
  }
}