import { NestFactory } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import cookieParser from 'cookie-parser';
import configuration from './config/configuration';
import { RedisModule } from './config/redis';
import { AuthModule } from './users/auth/auth.module';
import { CategoryModule } from './users/category/category.module';
import { AdminCategoryModule } from './admin/category/category.admin.module';
import {ProductModule} from './users/product/product.module';
import {AdminProductModule} from './admin/product/product.admin.module';
import { DiscountCodeModule } from './users/discountcode/discountcode.module';
import { AdminDiscountCodeModule } from './admin/discountcode/discountcode.admin.module';
import { PriceAlertModule } from './users/pricealert/pricealert.module';
import { CartModule } from './users/cart/cart.module';
import { OrderModule } from './users/order/order.module';
import { AdminOrderModule } from './admin/order/order.admin.module';
import { PaymentModule } from './users/payment/payment.module';
import { AdminPaymentModule } from './admin/payment/payment.admin.module';
import { ChatModule } from './users/chat/chat.module';
import { AddressModule } from './users/address/address.module'
import { ProfileModule } from './users/profile/profile.module';
import { AdminStatisticsModule } from './admin/statistics/statistics.admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),

    // Bắt buộc để các @Cron() (vd: check price alert) hoạt động
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    }),

    RedisModule,
    AuthModule,
    CategoryModule,
    AdminCategoryModule,
    ProductModule,
    AdminProductModule,
    DiscountCodeModule,
    AdminDiscountCodeModule,
    PriceAlertModule,
    CartModule,
    OrderModule,
    AdminOrderModule,
    PaymentModule,
    AdminPaymentModule,
    AdminProductModule,
    ChatModule,
    AddressModule,
    ProfileModule,
    AdminStatisticsModule,
  ],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT);
  await app.listen(port);
  console.log(`Server running at http://localhost:${port}/api`);
}
bootstrap();