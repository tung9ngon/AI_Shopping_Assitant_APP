import { IsString, MaxLength, MinLength } from 'class-validator';

// GET /api/places/autocomplete
export class AutocompletePlaceDto {
  @IsString()
  @MinLength(2, { message: 'Nhập ít nhất 2 ký tự để tìm địa chỉ' })
  @MaxLength(200)
  input: string;
}
