import { eq } from "drizzle-orm";
import { database } from "~/db";
import { user, type User } from "~/db/schema";

export async function findUserById(id: string): Promise<User | null> {
  const [result] = await database.select().from(user).where(eq(user.id, id)).limit(1);

  return result || null;
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const userData = await findUserById(userId);
  if (!userData) return false;

  return userData.isAdmin;
}

export async function updateUserDisplayName(
  userId: string,
  displayName: string
): Promise<void> {
  await database.update(user).set({ displayName }).where(eq(user.id, userId));
}
