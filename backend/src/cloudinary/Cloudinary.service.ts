import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  /** Upload 1 ảnh (buffer từ multer memoryStorage) lên Cloudinary */
  uploadImage(
    file: Express.Multer.File,
    folder = 'products',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result);
        },
      );
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  /** Xoá 1 ảnh trên Cloudinary theo public_id. Không throw nếu public_id rỗng/không tồn tại */
  async deleteImage(publicId: string | null | undefined): Promise<void> {
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch {
      // Không chặn luồng chính nếu xoá trên Cloudinary thất bại (vd: đã bị xoá trước đó)
    }
  }
}