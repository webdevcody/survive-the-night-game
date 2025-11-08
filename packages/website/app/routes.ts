import { type RouteConfig } from "@react-router/dev/routes";

export default [
  {
    path: "/",
    file: "routes/_index.tsx",
  },
  {
    path: "/play",
    file: "routes/play.tsx",
  },
  {
    path: "/leaderboard",
    file: "routes/leaderboard.tsx",
  },
  {
    path: "/editor",
    file: "routes/editor/index.tsx",
  },
  {
    path: "/changelog",
    file: "routes/changelog.tsx",
  },
  {
    path: "/privacy",
    file: "routes/privacy.tsx",
  },
  {
    path: "/terms",
    file: "routes/terms.tsx",
  },
] satisfies RouteConfig;
