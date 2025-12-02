import { database } from "~/db";
import { user } from "~/db/schema";
import { eq } from "drizzle-orm";
import type { SubscriptionPlan, SubscriptionStatus } from "~/db/schema";

interface SubscriptionData {
  subscriptionId: string;
  customerId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt?: Date;
}

export async function updateUserSubscription(
  userId: string,
  subscriptionData: SubscriptionData
) {
  try {
    const [updatedUser] = await database
      .update(user)
      .set({
        stripeCustomerId: subscriptionData.customerId,
        subscriptionId: subscriptionData.subscriptionId,
        plan: subscriptionData.plan,
        subscriptionStatus: subscriptionData.status,
        subscriptionExpiresAt: subscriptionData.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning();
    
    return updatedUser;
  } catch (error) {
    console.error("Failed to update user subscription:", error);
    throw new Error("Failed to update subscription");
  }
}

export async function getUserSubscription(userId: string) {
  try {
    const [userData] = await database
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        stripeCustomerId: user.stripeCustomerId,
        subscriptionId: user.subscriptionId,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
      })
      .from(user)
      .where(eq(user.id, userId));

    return userData;
  } catch (error) {
    console.error("Failed to get user subscription:", error);
    throw new Error("Failed to fetch subscription data");
  }
}

export async function updateUserPlan(userId: string, plan: SubscriptionPlan) {
  try {
    const [updatedUser] = await database
      .update(user)
      .set({
        plan,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning();
    
    return updatedUser;
  } catch (error) {
    console.error("Failed to update user plan:", error);
    throw new Error("Failed to update plan");
  }
}

export function isPlanActive(
  status: SubscriptionStatus | null | undefined,
  expiresAt: Date | null | undefined
): boolean {
  if (!status) return false;
  
  // Check if subscription is in an active state
  if (status !== "active") return false;
  
  // Check if subscription hasn't expired (if expiry date is set)
  if (expiresAt && new Date() > expiresAt) return false;
  
  return true;
}

export function hasAccess(
  userPlan: SubscriptionPlan,
  requiredPlan: SubscriptionPlan
): boolean {
  const planHierarchy: Record<SubscriptionPlan, number> = {
    free: 0,
    basic: 1,
    pro: 2,
  };

  return planHierarchy[userPlan] >= planHierarchy[requiredPlan];
}

export function getUploadLimit(plan: SubscriptionPlan): number {
  switch (plan) {
    case "pro":
      return -1; // Unlimited
    case "basic":
      return 50;
    case "free":
    default:
      return 5;
  }
}

export async function cancelUserSubscription(userId: string) {
  try {
    const [updatedUser] = await database
      .update(user)
      .set({
        subscriptionStatus: "canceled",
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning();
    
    return updatedUser;
  } catch (error) {
    console.error("Failed to cancel user subscription:", error);
    throw new Error("Failed to cancel subscription");
  }
}