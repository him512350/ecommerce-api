import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BundleConfig } from './entities/bundle-config.entity';
import { BundleGroup } from './entities/bundle-group.entity';
import { BundleGroupItem } from './entities/bundle-group-item.entity';
import { Product } from './entities/product.entity';
import {
  BundleSelection,
  BundleSelectionItem,
} from '../cart/entities/cart-item.entity';
import { BundlePricingType } from '../../common/enums';

interface RawBundleSelection {
  groupId: string;
  items: { groupItemId: string; quantity?: number }[];
}

export interface BundlePriceResult {
  unitPrice: number;
  selections: BundleSelection[];
}

@Injectable()
export class BundleService {
  constructor(
    @InjectRepository(BundleConfig)
    private readonly bundleConfigRepo: Repository<BundleConfig>,
    @InjectRepository(BundleGroup)
    private readonly bundleGroupRepo: Repository<BundleGroup>,
    @InjectRepository(BundleGroupItem)
    private readonly bundleGroupItemRepo: Repository<BundleGroupItem>,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
  ) {}

  // ── Admin: CRUD ───────────────────────────────────────────────────────────

  async createConfig(
    productId: string,
    dto: Partial<BundleConfig>,
  ): Promise<BundleConfig> {
    const product = await this.productsRepo.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.bundleConfigRepo.findOne({
      where: { productId },
    });
    if (existing)
      throw new BadRequestException(
        'Bundle config already exists for this product',
      );

    const config = this.bundleConfigRepo.create({ ...dto, productId } as any);
    const saved = await this.bundleConfigRepo.save(
      config as unknown as BundleConfig,
    );

    // Mark product as bundle type
    await this.productsRepo.update(productId, { productType: 'bundle' });

    return saved;
  }

  async getConfig(productId: string): Promise<BundleConfig> {
    const config = await this.bundleConfigRepo.findOne({
      where: { productId },
      relations: [
        'groups',
        'groups.items',
        'groups.items.product',
        'groups.items.variant',
      ],
    });
    if (!config) throw new NotFoundException('Bundle config not found');
    return config;
  }

  async updateConfig(
    productId: string,
    dto: Partial<BundleConfig>,
  ): Promise<BundleConfig> {
    const config = await this.getConfig(productId);
    Object.assign(config, dto);
    return this.bundleConfigRepo.save(config);
  }

  async deleteConfig(productId: string): Promise<void> {
    const config = await this.getConfig(productId);
    await this.bundleConfigRepo.remove(config);
    await this.productsRepo.update(productId, { productType: 'simple' });
  }

  async addGroup(
    productId: string,
    dto: Partial<BundleGroup>,
  ): Promise<BundleGroup> {
    const config = await this.getConfig(productId);
    const group = this.bundleGroupRepo.create({
      ...dto,
      bundleConfigId: config.id,
    } as any);
    return this.bundleGroupRepo.save(group as unknown as BundleGroup);
  }

  async updateGroup(
    groupId: string,
    dto: Partial<BundleGroup>,
  ): Promise<BundleGroup> {
    const group = await this.bundleGroupRepo.findOne({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');
    Object.assign(group, dto);
    return this.bundleGroupRepo.save(group);
  }

  async deleteGroup(groupId: string): Promise<void> {
    const group = await this.bundleGroupRepo.findOne({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');
    await this.bundleGroupRepo.remove(group);
  }

  async addGroupItem(
    groupId: string,
    dto: Partial<BundleGroupItem>,
  ): Promise<BundleGroupItem> {
    const group = await this.bundleGroupRepo.findOne({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');
    const item = this.bundleGroupItemRepo.create({ ...dto, groupId } as any);
    return this.bundleGroupItemRepo.save(item as unknown as BundleGroupItem);
  }

  async updateGroupItem(
    itemId: string,
    dto: Partial<BundleGroupItem>,
  ): Promise<BundleGroupItem> {
    const item = await this.bundleGroupItemRepo.findOne({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Item not found');
    Object.assign(item, dto);
    return this.bundleGroupItemRepo.save(item);
  }

  async deleteGroupItem(itemId: string): Promise<void> {
    const item = await this.bundleGroupItemRepo.findOne({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Item not found');
    await this.bundleGroupItemRepo.remove(item);
  }

  // ── Validation + price calculation (called by CartService) ────────────────

  async validateAndPrice(
    product: Product,
    rawSelections: RawBundleSelection[],
  ): Promise<BundlePriceResult> {
    const config = await this.getConfig(product.id);
    const selectionMap = new Map(rawSelections.map((s) => [s.groupId, s]));

    const resolvedSelections: BundleSelection[] = [];
    let calculatedSum = 0;
    let totalSelected = 0;

    for (const group of config.groups.sort(
      (a, b) => a.sortOrder - b.sortOrder,
    )) {
      const raw = selectionMap.get(group.id);
      const selectedItems = raw?.items ?? [];

      // Validate required groups
      if (group.isRequired && selectedItems.length < group.minSelections) {
        throw new BadRequestException(
          `Group "${group.name}" requires at least ${group.minSelections} selection(s). Got ${selectedItems.length}.`,
        );
      }

      // Validate max selections per group
      if (
        group.maxSelections !== null &&
        selectedItems.length > group.maxSelections
      ) {
        throw new BadRequestException(
          `Group "${group.name}" allows at most ${group.maxSelections} selection(s). Got ${selectedItems.length}.`,
        );
      }

      // Resolve each selected item
      const resolvedItems: BundleSelectionItem[] = [];

      for (const sel of selectedItems) {
        const groupItem = group.items.find((i) => i.id === sel.groupItemId);
        if (!groupItem) {
          throw new BadRequestException(
            `Item ${sel.groupItemId} does not belong to group "${group.name}"`,
          );
        }

        const qty = sel.quantity ?? groupItem.quantity;
        const itemPrice = groupItem.variant
          ? Number(groupItem.variant.price)
          : Number(groupItem.product.basePrice);

        calculatedSum += (itemPrice + Number(groupItem.priceModifier)) * qty;
        totalSelected += qty;

        resolvedItems.push({
          groupItemId: groupItem.id,
          productId: groupItem.productId,
          variantId: groupItem.variantId ?? undefined,
          productName: groupItem.product.name,
          quantity: qty,
          unitPrice: itemPrice,
          priceModifier: Number(groupItem.priceModifier),
        });
      }

      // Also add non-optional (required) default items that weren't in the selection
      for (const item of group.items) {
        if (
          !item.isOptional &&
          !resolvedItems.find((r) => r.groupItemId === item.id)
        ) {
          const itemPrice = item.variant
            ? Number(item.variant.price)
            : Number(item.product.basePrice);
          calculatedSum +=
            (itemPrice + Number(item.priceModifier)) * item.quantity;
          totalSelected += item.quantity;
          resolvedItems.push({
            groupItemId: item.id,
            productId: item.productId,
            variantId: item.variantId ?? undefined,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: itemPrice,
            priceModifier: Number(item.priceModifier),
          });
        }
      }

      if (resolvedItems.length > 0) {
        resolvedSelections.push({
          groupId: group.id,
          groupName: group.name,
          items: resolvedItems,
        });
      }
    }

    // Validate total selections across all groups
    if (totalSelected < config.minTotalSelections) {
      throw new BadRequestException(
        `Bundle requires at least ${config.minTotalSelections} total item(s). Got ${totalSelected}.`,
      );
    }
    if (
      config.maxTotalSelections !== null &&
      totalSelected > config.maxTotalSelections
    ) {
      throw new BadRequestException(
        `Bundle allows at most ${config.maxTotalSelections} total item(s). Got ${totalSelected}.`,
      );
    }

    // Compute final price
    let unitPrice: number;

    switch (config.pricingType) {
      case BundlePricingType.FIXED:
        unitPrice = Number(product.basePrice);
        break;
      case BundlePricingType.CALCULATED:
        unitPrice = +calculatedSum.toFixed(2);
        break;
      case BundlePricingType.DISCOUNTED:
        unitPrice = +(
          calculatedSum *
          (1 - Number(config.discountPercent) / 100)
        ).toFixed(2);
        break;
      default:
        unitPrice = Number(product.basePrice);
    }

    return { unitPrice, selections: resolvedSelections };
  }

  // Returns default selections for a fixed bundle (all non-optional items)
  async getDefaultSelections(productId: string): Promise<RawBundleSelection[]> {
    const config = await this.getConfig(productId);
    return config.groups.map((group) => ({
      groupId: group.id,
      items: group.items
        .filter((i) => i.isDefault || !i.isOptional)
        .map((i) => ({ groupItemId: i.id, quantity: i.quantity })),
    }));
  }
}
