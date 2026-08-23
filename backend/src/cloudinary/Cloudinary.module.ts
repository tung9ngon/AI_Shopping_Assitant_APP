import { Module } from '@nestjs/common';
import { CloudinaryProvider } from './Cloudinary.provider';
import { CloudinaryService } from './Cloudinary.service';

@Module({
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}