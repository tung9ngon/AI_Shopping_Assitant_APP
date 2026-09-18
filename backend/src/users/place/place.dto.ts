import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

// GET /api/places/autocomplete
export class AutocompletePlaceDto {
  @IsString()
  @MinLength(2, { message: 'Nhập ít nhất 2 ký tự để tìm địa chỉ' })
  @MaxLength(200)
  input: string;
}

// GET /api/places/districts — quận/huyện của một tỉnh/thành.
export class DistrictsQueryDto {
  @Type(() => Number)
  @IsInt({ message: 'province_code không hợp lệ' })
  province_code: number;
}

// GET /api/places/wards — phường/xã của một quận/huyện.
export class WardsQueryDto {
  @Type(() => Number)
  @IsInt({ message: 'district_code không hợp lệ' })
  district_code: number;
}

// GET /api/places/reverse — toạ độ ghim trên bản đồ đổi ngược thành chuỗi địa chỉ.
export class ReversePlaceDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'lat không hợp lệ' })
  @Min(-90)
  @Max(90)
  lat: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'lon không hợp lệ' })
  @Min(-180)
  @Max(180)
  lon: number;
}
