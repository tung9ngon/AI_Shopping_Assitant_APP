import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Cart } from '../../database/cart.entity';
import { CartItem } from '../../database/cart-item.entity';
import { Product } from '../../database/product.entity';
import { ProductImage } from '../../database/product-image.entity';
import { AddCartItemDto, UpdateCartItemDto } from './cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
  ) {}

  // Mỗi user chỉ có 1 giỏ hàng, tự tạo nếu chưa có
  private async findOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepo.findOne({ where: { user_id: userId } });
    if (!cart) {
      cart = this.cartRepo.create({ user_id: userId });
      cart = await this.cartRepo.save(cart);
    }
    return cart;
  }

  // GET /api/cart
  async getMyCart(userId: string) {
    const cart = await this.findOrCreateCart(userId);

    const items = await this.cartItemRepo.find({
      where: { cart_id: cart.id },
      relations: { product: true },
      order: { added_at: 'ASC' },
    });

    const productIds = items.map((i) => i.product_id);
    const primaryImages = productIds.length
      ? await this.imageRepo.find({
          where: { product_id: In(productIds), is_primary: true },
        })
      : [];
    const imageMap = new Map(
      primaryImages.map((img) => [img.product_id, img.image_url]),
    );

    let subtotal = 0;
    const mappedItems = items.map((item) => {
      const price = Number(item.product?.price ?? 0);
      subtotal += price * item.quantity;

      return {
        id: item.id,
        product: {
          id: item.product?.id,
          name: item.product?.name,
          price: item.product?.price,
          image: imageMap.get(item.product_id) ?? null,
        },
        quantity: item.quantity,
      };
    });

    return {
      id: cart.id,
      items: mappedItems,
      subtotal,
    };
  }

  // POST /api/cart/items
  async addItem(userId: string, dto: AddCartItemDto) {
    const cart = await this.findOrCreateCart(userId);

    const product = await this.productRepo.findOne({
      where: { id: dto.product_id, is_active: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    const quantity = dto.quantity ?? 1;

    let item = await this.cartItemRepo.findOne({
      where: { cart_id: cart.id, product_id: dto.product_id },
    });

    if (item) {
      // Sản phẩm đã có trong giỏ -> cộng dồn số lượng
      item.quantity += quantity;
      item = await this.cartItemRepo.save(item);
    } else {
      item = this.cartItemRepo.create({
        cart_id: cart.id,
        product_id: dto.product_id,
        quantity,
      });
      item = await this.cartItemRepo.save(item);
    }

    return {
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      added_at: item.added_at,
    };
  }

  // PUT /api/cart/items/:id
  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.findOrCreateCart(userId);

    const item = await this.cartItemRepo.findOne({
      where: { id: itemId, cart_id: cart.id },
    });
    if (!item)
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');

    item.quantity = dto.quantity;
    const saved = await this.cartItemRepo.save(item);

    return {
      id: saved.id,
      quantity: saved.quantity,
      updated_at: saved.updated_at,
    };
  }

  // DELETE /api/cart/items/:id
  async removeItem(userId: string, itemId: string) {
    const cart = await this.findOrCreateCart(userId);

    const item = await this.cartItemRepo.findOne({
      where: { id: itemId, cart_id: cart.id },
    });
    if (!item)
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');

    await this.cartItemRepo.remove(item);
    return { message: 'Đã xoá sản phẩm khỏi giỏ hàng' };
  }
}