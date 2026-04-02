import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Address } from './entities/address.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/utils/pagination.util';
import { MailService } from '../mail/mail.service';

export interface FirebaseUserPayload {
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService, // ← add
  ) {}

  // ── Firebase auto-provisioning ────────────────────────────────
  // Called on every authenticated request by FirebaseAuthGuard.
  // Creates the user in our DB the first time they log in via Firebase.

  async findOrCreateFromFirebase(payload: FirebaseUserPayload): Promise<User> {
    // 1. Try to find by Firebase UID (fastest path for returning users)
    let user = await this.usersRepo.findOne({
      where: { firebaseUid: payload.firebaseUid },
    });
    if (user) return user;

    // 2. Try to find by email (migration: user existed before Firebase was added)
    user = await this.usersRepo.findOne({
      where: { email: payload.email },
    });
    if (user) {
      // Link Firebase UID to existing account
      user.firebaseUid = payload.firebaseUid;
      if (payload.picture && !user.pictureUrl) {
        user.pictureUrl = payload.picture;
      }
      return this.usersRepo.save(user);
    }

    // 3. First-ever login — create new user
    const newUser = this.usersRepo.create({
      firebaseUid: payload.firebaseUid,
      email: payload.email,
      firstName: payload.firstName || payload.email.split('@')[0],
      lastName: payload.lastName,
      pictureUrl: payload.picture,
      isVerified: true,
    });
    const saved = await this.usersRepo.save(newUser);

// Send welcome email (fire and forget — never block login)
    this.mailService.sendWelcome(saved);

    return saved;

    return this.usersRepo.save(newUser);
  }

  // ── Standard CRUD ─────────────────────────────────────────────

  async findAll(pagination: PaginationDto) {
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC');

    if (pagination.search) {
      qb.where(
        'user.email ILIKE :s OR user.firstName ILIKE :s OR user.lastName ILIKE :s',
        { s: `%${pagination.search}%` },
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
    await this.usersRepo.softRemove(user);
  }

  // ── Addresses ─────────────────────────────────────────────────

  async addAddress(userId: string, dto: CreateAddressDto): Promise<Address> {
    await this.findOne(userId);

    return this.dataSource.transaction(async (manager) => {
      if (dto.isDefault) {
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
}
