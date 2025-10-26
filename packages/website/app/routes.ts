import { type RouteConfig } from "@react-router/dev/routes";

export default [
  // {
  //   path: "/",
  //   file: "routes/index.tsx",
  // },
  {
    path: "/",
    file: "routes/play.tsx",
  },
  {
    path: "/editor",
    file: "routes/editor/index.tsx",
  },
] satisfies RouteConfig;
