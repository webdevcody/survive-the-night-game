import { type RouteConfig } from "@react-router/dev/routes";

export default [
  {
    path: "/",
    file: "routes/index.tsx",
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
    path: "/privacy",
    file: "routes/privacy.tsx",
  },
  {
    path: "/terms",
    file: "routes/terms.tsx",
  },
  {
    path: "/.well-known/*",
    file: "routes/.well-known.$.tsx",
  },
] satisfies RouteConfig;
