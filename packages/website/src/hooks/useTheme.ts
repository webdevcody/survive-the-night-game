import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { getThemeFn, setThemeFn } from "~/components/theme-provider";

export function useThemeQuery() {
  return useSuspenseQuery({
    queryKey: ["theme"],
    queryFn: () => getThemeFn(),
  });
}

export function useSetTheme() {
  return useMutation({
    mutationFn: setThemeFn,
  });
}