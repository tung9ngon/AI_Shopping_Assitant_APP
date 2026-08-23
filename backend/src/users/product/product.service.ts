import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../database/product.entity';
import { ProductReview } from '../../database/product-review.entity';
import { OrderItem } from '../../database/order-item.entity';
import {
  CreateProductReviewDto,
  QueryProductDto,
  QueryProductReviewDto,
} from './product.dto';
import { OrderStatus } from '../../database/order.entity';
import { User } from '../../database/user.entity';


const COMPLETED_ORDER_STATUS: OrderStatus = 'paid';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductReview)
    private readonly reviewRepo: Repository<ProductReview>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
  ) {}

  // ---------- GET /api/products ----------
  async findAll(query: QueryProductDto) {
    const {
      search,
      categoryId,
      brand,
      tag,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.tags', 'tags')
      .leftJoinAndSelect(
        'product.images',
        'primaryImage',
        'primaryImage.is_primary = true',
      )
      .where('product.is_active = true');

    if (search) {
      qb.andWhere('product.name ILIKE :search', { search: `%${search}%` });
    }
    if (categoryId) {
      qb.andWhere('product.category_id = :categoryId', { categoryId });
    }
    if (brand) {
      qb.andWhere('product.brand ILIKE :brand', { brand: `%${brand}%` });
    }
    if (tag) {
      qb.andWhere('tags.name ILIKE :tag', { tag: `%${tag}%` });
    }
    if (minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    switch (sort) {
      case 'price_asc':
        qb.orderBy('product.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('product.price', 'DESC');
        break;
      case 'rating_desc':
        qb.orderBy('product.rating', 'DESC');
        break;
      case 'newest':
      default:
        qb.orderBy('product.created_at', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((p) => this.toListItem(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private toListItem(p: Product) {
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      rating: p.rating,
      primary_image: p.images?.[0]?.image_url ?? null,
      category_name: p.category?.name ?? null,
      tags: p.tags?.map((t) => t.name) ?? [],
    };
  }

  // ---------- GET /api/products/brands ----------
  /** Danh sách các hãng (brand) đang có sản phẩm active - phục vụ filter UI */
  async findAllBrands(): Promise<string[]> {
    const rows = await this.productRepo
      .createQueryBuilder('product')
      .select('DISTINCT product.brand', 'brand')
      .where('product.is_active = true')
      .andWhere('product.brand IS NOT NULL')
      .orderBy('product.brand', 'ASC')
      .getRawMany<{ brand: string }>();
    return rows.map((r) => r.brand);
  }

  // ---------- GET /api/products/:id ----------
  async findOne(id: string) {
    const product = await this.productRepo.findOne({
      where: { id, is_active: true },
      relations: { category: true, images: true, specs: true, tags: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    const reviewCount = await this.reviewRepo.count({ where: { product_id: id } });

    return { ...product, review_count: reviewCount };
  }

  // ---------- GET /api/products/:id/specs ----------
  async findSpecs(id: string) {
    const product = await this.productRepo.findOne({
      where: { id, is_active: true },
      relations: { specs: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    return product.specs.map((s) => ({
      spec_key: s.spec_key,
      spec_value: s.spec_value,
      spec_unit: s.spec_unit,
    }));
  }

  // ---------- GET /api/products/:id/reviews ----------
  async findReviews(id: string, query: QueryProductReviewDto) {
    const { page = 1, limit = 20 } = query;

    const [items, total] = await this.reviewRepo.findAndCount({
      where: { product_id: id },
      relations: { user: true },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map((r) => ({
        id: r.id,
        user_name: (r.user as User)?.full_name ?? 'Ẩn danh',
        avatar_url: (r.user as User)?.avatar_url ?? null,
        rating: r.rating,
        title: r.title,
        content: r.content,
        created_at: r.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ---------- POST /api/products/:id/reviews ----------
  async createReview(
    productId: string,
    userId: string,
    dto: CreateProductReviewDto,
  ): Promise<ProductReview> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    const purchasedItem = await this.orderItemRepo
      .createQueryBuilder('orderItem')
      .innerJoin('orderItem.order', 'order')
      .where('orderItem.product_id = :productId', { productId })
      .andWhere('order.user_id = :userId', { userId })
      .andWhere('order.status = :status', { status: COMPLETED_ORDER_STATUS })
      .getOne();

    if (!purchasedItem) {
      throw new ForbiddenException(
        'Bạn cần mua sản phẩm này (đơn hàng đã hoàn tất) trước khi đánh giá',
      );
    }

    const existed = await this.reviewRepo.findOne({
      where: { product_id: productId, user_id: userId },
    });
    if (existed) {
      throw new ForbiddenException('Bạn đã đánh giá sản phẩm này rồi');
    }

    const review = this.reviewRepo.create({
      product_id: productId,
      user_id: userId,
      rating: String(dto.rating),
      title: dto.title ?? null,
      content: dto.content ?? null,
    });
    return this.reviewRepo.save(review);
  }
}