import { createServerFn } from "@tanstack/react-start";
import { getLeaderboardStats } from "~/data-access/user-stats";

export const getLeaderboard = createServerFn({ method: "GET" }).handler(
  async () => {
    const stats = await getLeaderboardStats(100);
    return stats;
  }
);
