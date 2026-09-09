import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { NotificationType } from '../../database/notification.entity';

// GET /api/notifications
export class QueryNotificationDto {
  @IsOptional()
  @IsIn(['price_alert', 'deal', 'recommendation', 'order_update', 'system'])
  type?: NotificationType;

  // 'true' = chỉ lấy thông báo chưa đọc. Query string nên nhận chuỗi.
  @IsOptional()
  @IsIn(['true', 'false'])
  unread?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
