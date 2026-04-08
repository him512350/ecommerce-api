import { PartialType } from '@nestjs/swagger';
import { CreateTierConfigDto } from './create-tier-config.dto';

// All fields optional — validators still apply to whichever fields are sent.
export class UpdateTierConfigDto extends PartialType(CreateTierConfigDto) {}
