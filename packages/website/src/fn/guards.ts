import { redirect } from "@tanstack/react-router";
import { auth } from "~/utils/auth";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const assertAuthenticatedFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequest().headers;
  const session = await auth.api.getSession({
    headers: headers as unknown as Headers,
  });
  if (!session) {
    throw redirect({ to: "/sign-in", search: { redirect: getRequest().url } });
  }
});

/** Use on /play so guests are sent to sign-in before the game shell loads. */
export const requireSessionForPlayFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequest().headers;
  const session = await auth.api.getSession({
    headers: headers as unknown as Headers,
  });
  if (!session) {
    throw redirect({
      to: "/sign-in",
      search: { redirect: "/play" },
    });
  }
});

/** Use on /sign-in so logged-in users are sent to the home page. */
export const redirectHomeIfAuthenticatedFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequest().headers;
  const session = await auth.api.getSession({
    headers: headers as unknown as Headers,
  });
  if (session) {
    throw redirect({ to: "/" });
  }
});
