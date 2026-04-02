import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
  ) {}

  async findByProduct(productId: string): Promise<Inventory[]> {
    return this.inventoryRepo.find({
      where: { productId },
      relations: ['variant'],
    });
  }

  async update(id: string, dto: UpdateInventoryDto): Promise<Inventory> {
    const inventory = await this.inventoryRepo.findOne({ where: { id } });
    if (!inventory) throw new NotFoundException('Inventory record not found');
    Object.assign(inventory, dto);
    return this.inventoryRepo.save(inventory);
  }

  async getLowStock(): Promise<Inventory[]> {
    return this.inventoryRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.product', 'product')
      .leftJoinAndSelect('inv.variant', 'variant')
      .where('inv.quantity - inv.reservedQuantity <= inv.lowStockThreshold')
      .orderBy('inv.quantity', 'ASC')
      .getMany();
  }
}
