export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentProviderEnum {
  STRIPE = 'stripe',
}

export enum PaymentStatusEnum {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}

// ── Promotion engine enums ────────────────────────────────────────────────────

export enum PromotionType {
  COUPON = 'coupon', // customer must enter a code
  AUTOMATIC = 'automatic', // applied silently on every cart evaluation
  FREE_GIFT = 'free_gift', // injects a product into the cart automatically
}

export enum StackableMode {
  NONE = 'none', // exclusive — stops the pipeline when applied
  WITH_SAME = 'with_same', // stacks only with promotions of the same type
  ALL = 'all', // stacks freely with everything
}

export enum GroupOperator {
  AND = 'AND',
  OR = 'OR',
}

export enum ConditionType {
  CART_SUBTOTAL = 'cart_subtotal', // order subtotal >= X
  CART_QUANTITY = 'cart_quantity', // total item units >= X
  CART_ITEM_COUNT = 'cart_item_count', // distinct line items >= X
  PRODUCT_IDS = 'product_ids', // cart contains specific product(s)
  CATEGORY_IDS = 'category_ids', // cart contains product from category
  CUSTOMER_SEGMENT = 'customer_segment', // user belongs to segment(s)
  FIRST_ORDER_ONLY = 'first_order_only', // user has never placed an order
  DAY_OF_WEEK = 'day_of_week', // 0=Sun … 6=Sat
  TIME_OF_DAY = 'time_of_day', // { start: "HH:MM", end: "HH:MM" }
  MIN_ORDER_COUNT = 'min_order_count', // user has placed >= X orders before
}

export enum ComparisonOperator {
  GTE = 'gte', // >=
  LTE = 'lte', // <=
  EQ = 'eq', // ==
  IN = 'in', // value array contains at least one match
  NOT_IN = 'not_in', // value array has no match
}

export enum ActionType {
  PERCENTAGE_DISCOUNT = 'percentage_discount', // % off a target
  FIXED_DISCOUNT = 'fixed_discount', // fixed amount off
  FIXED_PRICE = 'fixed_price', // override price to exact value
  FREE_SHIPPING = 'free_shipping', // zero out shipping cost
  BOGO = 'bogo', // buy X get Y free / discounted
  TIERED_DISCOUNT = 'tiered_discount', // spend-band based %
  FREE_GIFT = 'free_gift', // inject a product at zero price
  BONUS_POINTS = 'bonus_points', // loyalty points multiplier
}

export enum ActionTarget {
  ORDER = 'order', // applies to whole order subtotal
  CHEAPEST_ITEM = 'cheapest_item', // targets the cheapest cart line
  MOST_EXPENSIVE = 'most_expensive', // targets the most expensive line
  SPECIFIC_PRODUCTS = 'specific_products', // targets listed product IDs
  CATEGORY = 'category', // targets items in listed categories
  SHIPPING = 'shipping', // targets shipping cost
}

// ── Product type enums ────────────────────────────────────────────────────────

export enum ProductType {
  SIMPLE = 'simple',
  VARIABLE = 'variable',
  BUNDLE = 'bundle',
}

export enum BundleType {
  FIXED = 'fixed', // all items included, no customer choice
  FLEXIBLE = 'flexible', // pick N from a pool with min/max total
  STEPPED = 'stepped', // groups act as steps; min/max per group
}

export enum BundlePricingType {
  FIXED = 'fixed', // use product's base_price regardless of selections
  CALCULATED = 'calculated', // sum of selected items + price_modifiers
  DISCOUNTED = 'discounted', // sum of selected items minus discount_percent
}

// ── Shipping enums ────────────────────────────────────────────────────────────

export enum ShippingRateCondition {
  ALWAYS = 'always', // always applies — use as the fallback
  ORDER_MIN = 'order_min', // cart total >= condition_min
  ORDER_MAX = 'order_max', // cart total <  condition_max
  ORDER_BETWEEN = 'order_between', // condition_min <= cart total < condition_max
  ITEM_COUNT_MIN = 'item_count_min', // total item count >= condition_min
}

export enum ShippingRateType {
  FIXED = 'fixed', // flat HKD amount
  FREE = 'free', // zero cost (clearer for admin than fixed=0)
  PER_ITEM = 'per_item', // cost × number of line items
  PERCENTAGE = 'percentage', // percentage of cart subtotal
}

// ── Points enums ──────────────────────────────────────────────────────────────

export enum PointsTransactionType {
  EARNED = 'earned',
  REDEEMED = 'redeemed',
  EXPIRED = 'expired',
  ADJUSTED_ADD = 'adjusted_add',
  ADJUSTED_DEDUCT = 'adjusted_deduct',
  REFUNDED = 'refunded',
}

// ── Email enums ───────────────────────────────────────────────────────────────

export enum EmailType {
  // Order — customer
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_PROCESSING = 'order_processing',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_COMPLETED = 'order_completed',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_REFUNDED = 'order_refunded',
  // Order — admin
  ORDER_NEW_ADMIN = 'order_new_admin',
  // Account
  WELCOME = 'welcome',
  TIER_UPGRADED = 'tier_upgraded',
  POINTS_EARNED = 'points_earned',
  // Loyalty
  BIRTHDAY_COUPON = 'birthday_coupon',
}

export enum EmailRecipientType {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  BOTH = 'both',
}
