import { Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { QueryNotificationDto } from './notification.dto';
import { JwtAccessGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth.decorator';

@Controller('notifications')
@UseGuards(JwtAccessGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // GET /api/notifications
  @Get()
  findMine(@CurrentUser() user: any, @Query() query: QueryNotificationDto) {
    return this.notificationService.findMine(user.sub, query);
  }

  // GET /api/notifications/unread-count
  // Đặt TRƯỚC các tuyến có tham số để 'unread-count' không bị nuốt thành :id.
  @Get('unread-count')
  unreadCount(@CurrentUser() user: any) {
    return this.notificationService.unreadCount(user.sub);
  }

  // PUT /api/notifications/read-all
  @Put('read-all')
  markAllRead(@CurrentUser() user: any) {
    return this.notificationService.markAllRead(user.sub);
  }

  // PUT /api/notifications/:id/read
  @Put(':id/read')
  markRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationService.markRead(user.sub, id);
  }
}
