import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

// GET /api/categories/:id
export class CategoryProductsQueryDto {
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