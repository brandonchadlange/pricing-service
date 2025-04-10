export type BillingPeriod = "monthly" | "quarterly" | "yearly" | "lifetime";
export type PricingModel = "one_off" | "recurring";

export interface PricingTier {
  id: number;
  name: string;
  pricingModel: PricingModel;
  basePrice: number;
  billingPeriod?: BillingPeriod;
  recurringDiscount?: number;
  features?: string[]; // Additional features included in this tier
}

export interface Product {
  id: number;
  name: string;
  description: string;
  pricingTiers: PricingTier[];
}

export interface PricingRule {
  id: number;
  name: string;
  type: "percentage_discount" | "fixed_discount" | "bulk_discount";
  value: number;
  minQuantity?: number;
  maxQuantity?: number;
  productId?: number;
  tierId?: number;
  applicablePricingModels?: PricingModel[];
}
