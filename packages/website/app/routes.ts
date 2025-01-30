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
] satisfies RouteConfig;
