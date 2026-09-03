import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { ConversationService } from './conversation.service';
import { CreateConversationDto, SendMessageDto, QueryMessagesDto } from './conversation.dto';
import { JwtAccessGuard, OptionalJwtAccessGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth.decorator';

// Cookie nhận diện THIẾT BỊ của khách chưa đăng nhập — không phải phiên đăng nhập, nên
// đặt hạn dài. Cùng kiểu httpOnly như access_token/refresh_token: JavaScript trên trang
// không đọc được, React Native tự gửi lại bằng kho cookie của hệ điều hành.
const GUEST_COOKIE = 'guest_id';
const GUEST_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 365 * 24 * 60 * 60 * 1000,
};

function readGuestId(req: Request): string | null {
  return (req.cookies?.[GUEST_COOKIE] as string | undefined) ?? null;
}

@Controller('conversations')
export class ConversationController {
  constructor(private conversationService: ConversationService) {}

  // Cho phép guest bắt đầu hội thoại (user_id NULL nếu chưa đăng nhập)
  @UseGuards(OptionalJwtAccessGuard)
  @Post()
  create(
    @CurrentUser() user: any,
    @Body() dto: CreateConversationDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = user?.sub ?? null;

    // Chưa đăng nhập: cấp định danh thiết bị nếu máy này chưa có, rồi gắn vào phiên.
    let guestId: string | null = null;
    if (!userId) {
      guestId = readGuestId(req) ?? randomUUID();
      res.cookie(GUEST_COOKIE, guestId, GUEST_COOKIE_OPTIONS);
    }

    return this.conversationService.create(userId, guestId, dto);
  }

  // "của tôi" -> bắt buộc đăng nhập, guest không có danh sách để liệt kê
  @UseGuards(JwtAccessGuard)
  @Get()
  findMine(@CurrentUser() user: any) {
    return this.conversationService.findMine(user.sub);
  }

  // Gán các phiên khách của thiết bị này cho tài khoản vừa đăng nhập.
  // Khai TRƯỚC @Get(':id')/@Post(':id/...) không bắt buộc (khác phương thức và khác
  // hình dạng đường dẫn), nhưng để cạnh @Get() cho dễ đọc cùng nhóm "của tôi".
  @UseGuards(JwtAccessGuard)
  @Post('claim')
  @HttpCode(200)
  async claim(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.conversationService.claim(user.sub, readGuestId(req));
    // Cookie cũ đã hết việc: phiên nào của nó cũng đã có chủ. Giữ lại chỉ tổ để người
    // đăng nhập sau trên cùng máy vơ luôn phiên khách của người trước.
    res.clearCookie(GUEST_COOKIE, GUEST_COOKIE_OPTIONS);
    return result;
  }

  // Guest vẫn xem được cuộc hội thoại guest của chính mình (đã có id từ bước POST)
  @UseGuards(OptionalJwtAccessGuard)
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string, @Req() req: Request) {
    return this.conversationService.findOne(id, user?.sub ?? null, readGuestId(req));
  }

  @UseGuards(OptionalJwtAccessGuard)
  @Post(':id/messages')
  sendMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Req() req: Request,
  ) {
    return this.conversationService.sendMessage(id, user?.sub ?? null, readGuestId(req), dto);
  }

  @UseGuards(OptionalJwtAccessGuard)
  @Get(':id/messages')
  getMessages(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query() query: QueryMessagesDto,
    @Req() req: Request,
  ) {
    return this.conversationService.getMessages(id, user?.sub ?? null, readGuestId(req), query);
  }
}
