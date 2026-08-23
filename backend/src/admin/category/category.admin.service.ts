import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Category } from '../../database/category.entity';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  QueryCategoryDto,
} from './category.admin.dto';

@Injectable()
export class AdminCategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async findAllForAdmin(query: QueryCategoryDto) {
    const { search, isActive, page = 1, limit = 20 } = query;

    const [items, total] = await this.categoryRepo.findAndCount({
      where: {
        ...(search ? { name: ILike(`%${search}%`) } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      order: { sortOrder: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneOrFail(id: string): Promise<Category> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
    return category;
  }

  create(dto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepo.create(dto);
    return this.categoryRepo.save(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOneOrFail(id);
    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  // Xoá mềm
  async remove(id: string): Promise<{ message: string }> {
    const category = await this.findOneOrFail(id);
    category.isActive = false;
    await this.categoryRepo.save(category);
    return { message: 'Đã ẩn danh mục thành công' };
  }

  // Xoá cứng khỏi DB
  async hardRemove(id: string): Promise<{ message: string }> {
    const category = await this.findOneOrFail(id);
    await this.categoryRepo.remove(category);
    return { message: 'Đã xoá danh mục thành công' };
  }
}