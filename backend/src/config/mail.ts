import { Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('mail.host'),
      port: Number(this.config.get('mail.port')),
      secure: false,
      requireTLS: true,
      auth: {
        user: this.config.get('mail.user'),
        pass: this.config.get('mail.pass'),
      },
    });
  }

  async sendOtp(to: string, otp: string) {
    await this.transporter.sendMail({
      from: `"ShopAI" <${this.config.get('mail.user')}>`,
      to,
      subject: 'Mã xác thực tài khoản',
      html: `
        <p>Mã OTP của bạn là:</p>
        <h2>${otp}</h2>
        <p>Mã có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
      `,
    });
  }

  // Gửi email khi sản phẩm theo dõi đã giảm đến giá mong muốn
  async sendPriceAlertTriggered(
    to: string,
    productName: string,
    currentPrice: number,
    targetPrice: number,
  ) {
    await this.transporter.sendMail({
      from: `"ShopAI" <${this.config.get('mail.user')}>`,
      to,
      subject: `Giá đã giảm: ${productName}`,
      html: `
        <p>Sản phẩm bạn đang theo dõi đã giảm đến mức giá mong muốn:</p>
        <h3>${productName}</h3>
        <p>Giá hiện tại: <strong>${currentPrice.toLocaleString('vi-VN')}đ</strong></p>
        <p>Giá mong muốn của bạn: ${targetPrice.toLocaleString('vi-VN')}đ</p>
        <p>Nhanh tay đặt hàng trước khi giá thay đổi!</p>
      `,
    });
  }
}

@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}