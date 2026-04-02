import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { FirebaseAdminProvider } from './providers/firebase-admin.provider';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [UsersModule],
  providers: [FirebaseAdminProvider, FirebaseAuthGuard, AuthService],
  controllers: [AuthController],
  exports: [FirebaseAdminProvider, FirebaseAuthGuard, UsersModule], // ← add UsersModule here
})
export class AuthModule {}
