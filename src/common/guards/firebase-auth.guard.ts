import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as admin from 'firebase-admin';
import { FIREBASE_ADMIN } from '../../modules/auth/providers/firebase-admin.provider';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No Bearer token provided');
    }

    let decodedToken: admin.auth.DecodedIdToken;

    try {
      decodedToken = await this.firebaseApp.auth().verifyIdToken(token);
    } catch (error) {
      this.logger.warn(`Token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }

    // Find existing user or create on first login (auto-provisioning)
    const user = await this.usersService.findOrCreateFromFirebase({
      firebaseUid: decodedToken.uid,
      email: decodedToken.email ?? '',
      firstName: this.extractFirstName(decodedToken.name),
      lastName: this.extractLastName(decodedToken.name),
      picture: decodedToken.picture,
    });

    request['user'] = user;
    return true;
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.substring(7).trim();
  }

  private extractFirstName(displayName?: string): string {
    if (!displayName) return '';
    return displayName.split(' ')[0] ?? '';
  }

  private extractLastName(displayName?: string): string {
    if (!displayName) return '';
    const parts = displayName.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }
}
