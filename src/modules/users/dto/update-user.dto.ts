import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// Exclude password & role from self-update; admins can update role separately
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'role', 'email'] as const),
) {}
