import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriceAlert } from '../../database/price-alert.entity';
import { Product } from '../../database/product.entity';
import { ProductImage } from '../../database/product-image.entity';
import { MailService } from '../../config/mail';
import { CreatePriceAlertDto } from './pricealert.dto';

@Injectable()
export class PriceAlertService {
  private readonly logger = new Logger(PriceAlertService.name);

  constructor(
    @InjectRepository(PriceAlert)
    private readonly alertRepo: Repository<PriceAlert>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    private readonly mail: MailService,
  ) {}

  // GET /api/price-alerts
  async findMine(userId: string) {
    const alerts = await this.alertRepo.find({
      where: { user_id: userId },
      relations: { product: true },
      order: { created_at: 'DESC' },
    });

    const productIds = alerts.map((a) => a.product_id);
    const primaryImages = productIds.length
      ? await this.imageRepo.find({
          where: { product_id: In(productIds), is_primary: true },
        })
      : [];
    const imageMap = new Map(
      primaryImages.map((img) => [img.product_id, img.image_url]),
    );

    return alerts.map((a) => ({
      id: a.id,
      product: {
        id: a.product?.id,
        name: a.product?.name,
        price: a.product?.price,
        image: imageMap.get(a.product_id) ?? null,
      },
      target_price: a.target_price,
      status: a.status,
      notify_channel: a.notify_channel,
      created_at: a.created_at,
    }));
  }

  // POST /api/price-alerts
  async create(userId: string, dto: CreatePriceAlertDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.product_id },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    const alert = this.alertRepo.create({
      user_id: userId,
      product_id: dto.product_id,
      target_price: dto.target_price,
      notify_channel: dto.notify_channel ?? 'app',
      status: 'active',
    });
    const saved = await this.alertRepo.save(alert);

    return {
      id: saved.id,
      product_id: saved.product_id,
      target_price: saved.target_price,
      status: saved.status,
      notify_channel: saved.notify_channel,
    };
  }

  // DELETE /api/price-alerts/:id
  async remove(userId: string, id: string) {
    const alert = await this.alertRepo.findOne({
      where: { id, user_id: userId },
    });
    if (!alert) throw new NotFoundException('Không tìm thấy theo dõi giá');

    alert.status = 'cancelled';
    await this.alertRepo.save(alert);

    return { message: 'Đã huỷ theo dõi giá' };
  }

  // Chạy định kỳ mỗi 10 phút: so sánh giá hiện tại của sản phẩm với target_price
  // Nếu giá <= target_price -> đánh dấu triggered + gửi email (nếu notify_channel = email)
  @Cron('*/30 * * * * *')
  async checkAndTriggerAlerts() {
    const activeAlerts = await this.alertRepo.find({
      where: { status: 'active' },
      relations: { product: true, user: true },
    });

    if (!activeAlerts.length) return;

    for (const alert of activeAlerts) {
      if (!alert.product) continue;

      const currentPrice = Number(alert.product.price);
      const targetPrice = Number(alert.target_price);

      if (currentPrice <= targetPrice) {
        alert.status = 'triggered';
        alert.triggered_at = new Date();
        await this.alertRepo.save(alert);

        if (alert.notify_channel === 'email' && alert.user?.email) {
          try {
            await this.mail.sendPriceAlertTriggered(
              alert.user.email,
              alert.product.name,
              currentPrice,
              targetPrice,
            );
          } catch (err) {
            this.logger.error(
              `Gửi email price alert thất bại cho user ${alert.user_id}: ${err}`,
            );
          }
        }
      }
    }
  }
}