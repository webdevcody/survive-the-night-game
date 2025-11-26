/**
 * Pricing configuration for Survive the Night
 * Centralized pricing information for easy updates across the app
 */

export interface PricingPlan {
  name: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  description: string;
  features: string[];
  paymentType: string;
}

/**
 * Calculate original price from discounted price and discount percentage
 * Formula: originalPrice = discountedPrice / (1 - discountPercent / 100)
 */
function calculateOriginalPrice(discountedPrice: number, discountPercent: number): number {
  return Math.round(discountedPrice / (1 - discountPercent / 100));
}

export const PRICING_CONFIG: PricingPlan = {
  name: "Premium Plan",
  discountedPrice: 199,
  discountPercent: 30,
  originalPrice: calculateOriginalPrice(199, 30), // Calculates to 284
  description: "One-time payment",
  features: [
    "Full game access",
    "All premium features",
    "Priority support",
    "Exclusive content",
  ],
  paymentType: "One-time payment",
} as const;

/**
 * Format price as currency string
 */
export function formatPrice(price: number): string {
  return `$${price}`;
}

/**
 * Get the discount amount in dollars
 */
export function getDiscountAmount(plan: PricingPlan): number {
  return plan.originalPrice - plan.discountedPrice;
}

