import { redirect } from "@tanstack/react-router";
import { auth } from "~/utils/auth";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const assertAuthenticatedFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequest().headers;
    const session = await auth.api.getSession({
      headers: headers as unknown as Headers,
    });
    if (!session) {
      throw redirect({ to: "/unauthenticated" });
    }
  }
);
