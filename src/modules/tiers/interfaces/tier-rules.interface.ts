// ── Condition types ───────────────────────────────────────────────────────────

export type UpgradeConditionType =
  | 'single_order_amount' // one order's paid total >= minAmount
  | 'cumulative_amount_in_days' // sum of paid orders in last N days >= minAmount
  | 'order_count_in_days' // number of paid orders in last N days >= minCount
  | 'manual'; // assigned directly by admin — never auto-evaluated

export interface UpgradeCondition {
  type: UpgradeConditionType;
  minAmount?: number; // used by single_order_amount, cumulative_amount_in_days
  minCount?: number; // used by order_count_in_days
  withinDays?: number; // used by cumulative_amount_in_days, order_count_in_days
}

// Conditions inside a group combine with the group's operator (AND | OR)
export interface UpgradeConditionGroup {
  operator: 'AND' | 'OR';
  conditions: UpgradeCondition[];
}

// ── Reason codes written to history log ──────────────────────────────────────

export type TierChangeReason =
  | 'single_order_upgrade'
  | 'cumulative_upgrade'
  | 'order_count_upgrade'
  | 'renewal'
  | 'expiry_downgrade'
  | 'admin_upgrade'
  | 'admin_downgrade'
  | 'admin_reset';
