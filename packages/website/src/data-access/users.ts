import { eq } from "drizzle-orm";
import { database } from "~/db";
import { user, type User, type SubscriptionPlan } from "~/db/schema";

export async function findUserById(id: string): Promise<User | null> {
  const [result] = await database
    .select()
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  return result || null;
}

export async function getUserPlan(userId: string): Promise<{
  plan: SubscriptionPlan;
  isActive: boolean;
  expiresAt: Date | null;
}> {
  const userData = await findUserById(userId);
  
  if (!userData) {
    return { 
      plan: "free", 
      isActive: false, 
      expiresAt: null 
    };
  }

  const plan = (userData.plan || "free") as SubscriptionPlan;
  const now = new Date();
  const expiresAt = userData.subscriptionExpiresAt;
  
  const isActive = plan === "free" || 
    (userData.subscriptionStatus === "active" && 
     (!expiresAt || expiresAt > now));

  return {
    plan,
    isActive,
    expiresAt
  };
}

export function hasValidPlan(userPlan: { plan: SubscriptionPlan; isActive: boolean }, requiredPlan: SubscriptionPlan): boolean {
  if (!userPlan.isActive) {
    return false;
  }

  const planHierarchy = {
    "free": 0,
    "basic": 1, 
    "pro": 2
  };

  return planHierarchy[userPlan.plan] >= planHierarchy[requiredPlan];
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const userData = await findUserById(userId);
  if (!userData) return false;

  return userData.isAdmin;
}