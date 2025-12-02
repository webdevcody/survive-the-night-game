import { queryOptions } from "@tanstack/react-query";
import { getUserByIdFn } from "~/fn/users";

export const userQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["user", userId],
    queryFn: () => getUserByIdFn({ data: { userId } }),
  });
