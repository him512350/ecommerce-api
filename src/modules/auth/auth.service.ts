import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SyncProfileDto } from './dto/sync-profile.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  // Called by POST /auth/sync — lets the frontend push updated profile data
  // (e.g. first/last name collected during onboarding) into our DB
  async syncProfile(userId: string, dto: SyncProfileDto): Promise<User> {
    return this.usersService.update(userId, dto);
  }
}
