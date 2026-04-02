import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from './jwt.strategy';

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly configService: ConfigService) {
    const secret = configService.get<string>('jwt.refreshSecret');
    if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    } as any);
  }

  validate(req: Request, payload: JwtPayload): JwtRefreshPayload {
    const authHeader = req.get('authorization');
    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }
    const refreshToken = authHeader.replace('Bearer ', '').trim();
    return { ...payload, refreshToken };
  }
}
