import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SyncProfileDto } from './dto/sync-profile.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@ApiBearerAuth('access-token')
@UseGuards(FirebaseAuthGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiOperation({
    summary:
      'Get current user — also triggers auto-provisioning on first login',
  })
  getMe(@CurrentUser() user: any) {
    // FirebaseAuthGuard already looked up / created the user in DB.
    // Just return the attached user object.
    return user;
  }

  @Post('sync')
  @ApiOperation({
    summary: 'Update profile data after registration (name, phone, etc.)',
  })
  syncProfile(@CurrentUser('id') userId: string, @Body() dto: SyncProfileDto) {
    return this.authService.syncProfile(userId, dto);
  }
}
