import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/user.entity';
import { UserProfile } from '../../database/user-profile.entity';
import { QueryUsersDto, AdminUpdateUserDto } from './profile.admin.dto';

// Dùng cho QueryBuilder.select() (nhận string[] dạng "alias.field")
const PUBLIC_USER_FIELDS = [
  'id',
  'full_name',
  'email',
  'phone_number',
  'avatar_url',
  'role',
  'is_active',
  'created_at',
] as const;

// Dùng cho repo.findOne({ select }) — TypeORM yêu cầu dạng object, không nhận mảng
const PUBLIC_USER_SELECT = {
  id: true,
  full_name: true,
  email: true,
  phone_number: true,
  avatar_url: true,
  role: true,
  is_active: true,
  created_at: true,
} as const;

@Injectable()
export class ProfileAdminService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserProfile) private profileRepo: Repository<UserProfile>,
  ) {}

  // ---------- GET /admin/users ----------
  async findAll(query: QueryUsersDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.userRepo
      .createQueryBuilder('u')
      .select(PUBLIC_USER_FIELDS.map((f) => `u.${f}`));

    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query.is_active !== undefined) {
      qb.andWhere('u.is_active = :isActive', { isActive: query.is_active === 'true' });
    }
    if (query.search) {
      const kw = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(u.full_name) LIKE :kw OR LOWER(u.email) LIKE :kw OR u.phone_number LIKE :kw)',
        { kw },
      );
    }

    qb.orderBy('u.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // ---------- GET /admin/users/:id ----------
  async findOneDetail(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const profile = await this.profileRepo.findOne({ where: { user_id: id } });

    return {
      ...user,
      profile: profile
        ? {
            user_segment: profile.user_segment,
            occupation: profile.occupation,
            age_range: profile.age_range,
            interests: profile.interests ?? [],
          }
        : null,
    };
  }

  // ---------- PUT /admin/users/:id ----------
  async updateStatusOrRole(id: string, dto: AdminUpdateUserDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (dto.role !== undefined) user.role = dto.role as any;
    if (dto.is_active !== undefined) user.is_active = dto.is_active as any;

    await this.userRepo.save(user);

    return {
      id: user.id,
      role: user.role,
      is_active: user.is_active,
      updated_at: (user as any).updated_at,
    };
  }

  // ---------- DELETE /admin/users/:id ----------
  async remove(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    await this.userRepo.remove(user);
    return { message: 'Đã xoá tài khoản người dùng' };
  }
}