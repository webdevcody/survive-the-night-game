import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { findUserById } from "~/data-access/users";

export const getUserByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ userId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const user = await findUserById(data.userId);
    if (!user) {
      throw new Error("User not found");
    }
    // Exclude email from public profile response
    const { email, ...publicUser } = user;
    return publicUser;
  });
