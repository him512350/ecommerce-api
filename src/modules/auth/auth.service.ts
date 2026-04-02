import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) { }

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive)
      throw new UnauthorizedException('Invalid credentials');

    const isValid = await this.usersService.validatePassword(
      user,
      dto.password,
    );
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return { user, ...tokens };
  }

  async refresh(userId: string, refreshToken: string) {
    // Find stored token
    const storedToken = await this.refreshTokenRepo.findOne({
      where: { userId, isRevoked: false },
    });
    if (!storedToken) throw new ForbiddenException('Access denied');

    // Verify the token matches the stored hash
    const tokenMatches = await bcrypt.compare(refreshToken, storedToken.token);
    if (!tokenMatches) throw new ForbiddenException('Access denied');

    // Check expiry
    if (new Date() > storedToken.expiresAt) {
      await this.refreshTokenRepo.remove(storedToken);
      throw new ForbiddenException(
        'Refresh token expired, please log in again',
      );
    }

    const user = await this.usersService.findOne(userId);
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Rotate: delete old, store new (token rotation is a security best practice)
    await this.refreshTokenRepo.remove(storedToken);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user, ...tokens };
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokenRepo.delete({ userId });
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private async generateTokens(userId: string, email: string, role: string) {
    const payload: JwtPayload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.accessSecret'),
        expiresIn: this.configService.get('jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    token: string,
  ): Promise<void> {
    const hashedToken = await bcrypt.hash(token, 10);
    const expiresIn = this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d'; // e.g. '7d'
    const days = parseInt(expiresIn);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const refreshToken = this.refreshTokenRepo.create({
      userId,
      token: hashedToken,
      expiresAt,
    });
    await this.refreshTokenRepo.save(refreshToken);
  }
}
