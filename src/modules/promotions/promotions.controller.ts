import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Promotions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a promotion (admin)' })
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all promotions with pagination (admin)' })
  findAll(@Query() pagination: PaginationDto) {
    return this.promotionsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a promotion by ID (admin)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotionsService.findOne(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a promotion (admin)' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotionsService.activate(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a promotion (admin)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotionsService.deactivate(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a promotion permanently (admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotionsService.remove(id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get usage logs for a promotion (admin)' })
  getUsage(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.promotionsService.getUsageLogs(id, pagination);
  }

  // ── User segment endpoints ────────────────────────────────────────────────

  @Post('segments/:userId')
  @ApiOperation({ summary: 'Add a segment tag to a user (admin)' })
  addSegment(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { segment: string; expiresAt?: Date },
  ) {
    return this.promotionsService.addUserSegment(
      userId,
      body.segment,
      body.expiresAt,
    );
  }

  @Delete('segments/:userId/:segment')
  @ApiOperation({ summary: 'Remove a segment tag from a user (admin)' })
  removeSegment(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('segment') segment: string,
  ) {
    return this.promotionsService.removeUserSegment(userId, segment);
  }

  @Get('segments/:userId')
  @ApiOperation({ summary: 'List all segment tags for a user (admin)' })
  getUserSegments(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.promotionsService.getUserSegments(userId);
  }
}
