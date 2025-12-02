import { createServerFn } from "@tanstack/react-start";
import { createContext, useContext, useEffect } from "react";
import { z } from "zod";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { useThemeQuery, useSetTheme } from "~/hooks/useTheme";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = { theme: Theme; setTheme: (theme: Theme) => void };

const THEME_COOKIE_NAME = "ui-theme";

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export const getThemeFn = createServerFn().handler(async () => {
  const theme = getCookie(THEME_COOKIE_NAME);
  return theme ?? "system";
});

export const setThemeFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ theme: z.enum(["dark", "light", "system"]) }))
  .handler(async ({ data }) => {
    setCookie(THEME_COOKIE_NAME, data.theme);
    return data.theme;
  });

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const themeQuery = useThemeQuery();
  const setThemeMutation = useSetTheme();

  useEffect(() => {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (event) => {
        if (themeQuery.data === "system") {
          const newColorScheme = event.matches ? "dark" : "light";
          const root = window.document.documentElement;
          root.classList.remove("light", "dark");
          root.classList.add(newColorScheme);
        }
      });
  }, [themeQuery.data]);

  useEffect(() => {
    const theme = themeQuery.data as Theme;
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [themeQuery.data]);

  const value = {
    theme: themeQuery.data as Theme,
    setTheme: (theme: Theme) => {
      console.log("setting theme", theme);
      setThemeMutation.mutate(
        { data: { theme } },
        {
          onSuccess: () => {
            themeQuery.refetch();
          },
        }
      );
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
