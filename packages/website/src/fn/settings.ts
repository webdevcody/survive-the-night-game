import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { updateUserDisplayName, findUserById } from "~/data-access/users";

const displayNameSchema = z
  .string()
  .min(4, "Display name must be at least 4 characters")
  .max(16, "Display name must be at most 16 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Display name can only contain letters, numbers, underscores, and hyphens"
  );

export const updateDisplayNameFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ displayName: displayNameSchema }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await updateUserDisplayName(userId, data.displayName);
    return { success: true };
  });

export const getCurrentUserFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    const user = await findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return {
      id: user.id,
      name: user.name,
      displayName: user.displayName,
      email: user.email,
    };
  });
