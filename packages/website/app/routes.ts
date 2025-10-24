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
    path: "/editor",
    file: "routes/editor.tsx",
  },
] satisfies RouteConfig;
