import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProductService } from './product.service';
import {
  CreateProductReviewDto,
  QueryProductDto,
  QueryProductReviewDto,
} from './product.dto';
import { JwtAccessGuard } from '../auth/auth.guard';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // GET /api/products - tìm kiếm/lọc sản phẩm (category, brand, giá, tag...)
  @Get()
  findAll(@Query() query: QueryProductDto) {
    return this.productService.findAll(query);
  }

  // GET /api/products/brands - danh sách hãng đang có sản phẩm (phục vụ filter UI)
  @Get('brands')
  findAllBrands() {
    return this.productService.findAllBrands();
  }

  // GET /api/products/:id - chi tiết sản phẩm
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  // GET /api/products/:id/specs - thông số kỹ thuật
  @Get(':id/specs')
  findSpecs(@Param('id') id: string) {
    return this.productService.findSpecs(id);
  }

  // GET /api/products/:id/reviews - danh sách đánh giá (phân trang)
  @Get(':id/reviews')
  findReviews(@Param('id') id: string, @Query() query: QueryProductReviewDto) {
    return this.productService.findReviews(id, query);
  }

  // POST /api/products/:id/reviews - viết đánh giá (yêu cầu đăng nhập + đã mua hàng)
  @Post(':id/reviews')
  @UseGuards(JwtAccessGuard)
  createReview(
    @Param('id') id: string,
    @Body() dto: CreateProductReviewDto,
    @Req() req: any,
  ) {
    return this.productService.createReview(id, req.user.id, dto);
  }
}