import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireSessionForPlayFn } from "~/fn/guards";

/**
 * Bookmark-friendly alias: /play/world/100 → /play?world=100
 */
export const Route = createFileRoute("/play/world/$worldId")({
  beforeLoad: async ({ params }) => {
    await requireSessionForPlayFn();
    const n = parseInt(params.worldId, 10);
    if (!Number.isFinite(n) || n < 1) {
      throw redirect({ to: "/play", replace: true });
    }
    throw redirect({
      to: "/play",
      search: { world: n },
      replace: true,
    });
  },
  component: () => null,
});
