import { ActionType } from '../../../common/enums';

export interface ItemPricing {
  cartItemId: string;
  productId: string;
  variantId?: string;
  productName: string;
  quantity: number;
  unitPrice: number; // original unit price snapshot
  lineTotal: number; // quantity * unitPrice (before discount)
  discountAmount: number; // total discount applied to this line
  finalTotal: number; // lineTotal - discountAmount
}

export interface GiftItem {
  productId: string;
  variantId?: string;
  quantity: number;
  promotionId: string;
  promotionName: string;
}

export interface AppliedPromotion {
  promotionId: string;
  promotionName: string;
  code?: string;
  discountAmount: number;
  actionType: ActionType;
}

export interface CartPricingResult {
  itemPricings: ItemPricing[];
  giftItems: GiftItem[];
  subtotal: number; // sum of all lineTotals (before discounts)
  itemDiscountTotal: number; // sum of all line discounts
  shippingCost: number; // base shipping before discount
  shippingDiscount: number; // shipping discount from free_shipping actions
  taxAmount: number;
  total: number; // subtotal - itemDiscountTotal - shippingDiscount + (shippingCost - shippingDiscount) + taxAmount
  appliedPromotions: AppliedPromotion[];
}
