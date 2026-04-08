import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products/:productId')
  @ApiOperation({ summary: 'Get inventory for a product' })
  findByProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.inventoryService.findByProduct(productId);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'List all low-stock items' })
  getLowStock() {
    return this.inventoryService.getLowStock();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory quantity' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(id, dto);
  }
}