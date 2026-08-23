import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateMeDto, UpdateProfileDto, UpdatePreferencesDto } from './profile.dto';
import { JwtAccessGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth.decorator';


@UseGuards(JwtAccessGuard)
@Controller('users/me')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  getMe(@CurrentUser() user: any) {
    return this.profileService.getMe(user.sub);
  }

  @Put()
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateMeDto) {
    return this.profileService.updateMe(user.sub, dto);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.profileService.getMyProfile(user.sub);
  }

  @Put('profile')
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateMyProfile(user.sub, dto);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: any) {
    return this.profileService.getMyPreferences(user.sub);
  }

  @Put('preferences')
  updatePreferences(@CurrentUser() user: any, @Body() dto: UpdatePreferencesDto) {
    return this.profileService.updateMyPreferences(user.sub, dto);
  }
}