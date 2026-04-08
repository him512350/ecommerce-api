import { ActionType } from '../../../common/enums';

export interface ItemPricing {
  cartItemId: string;
  productId: string;
  variantId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  discountAmount: number;
  finalTotal: number;
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

// Returned by ShippingCalculatorService
export interface ShippingOption {
  methodId: string;
  methodName: string;
  description: string | null;
  estimatedDays: string | null;
  cost: number;
  isFree: boolean;
  zoneId: string;
  zoneName: string;
}

export interface CartPricingResult {
  itemPricings: ItemPricing[];
  giftItems: GiftItem[];
  subtotal: number;
  itemDiscountTotal: number;
  availableShipping: ShippingOption[];
  shippingCost: number;
  shippingDiscount: number;
  // Points redemption
  redeemedPoints: number;       // points applied to this cart
  pointsDiscount: number;       // HKD value of those points
  taxAmount: number;
  total: number;
  appliedPromotions: AppliedPromotion[];
  selectedShippingMethodId: string | null;
}
