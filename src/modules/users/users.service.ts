import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Address } from './entities/address.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/utils/pagination.util';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const exists = await this.usersRepo.findOne({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.usersRepo.create({ ...dto, passwordHash });
    return this.usersRepo.save(user);
  }

  async findAll(pagination: PaginationDto) {
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .withDeleted()
      .orderBy('user.createdAt', 'DESC');

    if (pagination.search) {
      qb.where(
        'user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search',
        { search: `%${pagination.search}%` },
      );
    }

    return paginate(qb, pagination);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations: ['addresses'],
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    return this.usersRepo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepo.softRemove(user); // soft delete — sets deleted_at
  }

  // ── Addresses ───────────────────────────────────────────────────

  async addAddress(userId: string, dto: CreateAddressDto): Promise<Address> {
    await this.findOne(userId); // ensure user exists

    return this.dataSource.transaction(async (manager) => {
      if (dto.isDefault) {
        // Unset any existing default
        await manager.update(Address, { userId }, { isDefault: false });
      }
      const address = manager.create(Address, { ...dto, userId });
      return manager.save(address);
    });
  }

  async getAddresses(userId: string): Promise<Address[]> {
    await this.findOne(userId);
    return this.addressRepo.find({
      where: { userId },
      order: { isDefault: 'DESC' },
    });
  }

  async removeAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');
    await this.addressRepo.remove(address);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }
}
