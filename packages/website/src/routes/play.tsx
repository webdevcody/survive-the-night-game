import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PredictionConfigPanel } from "./play/-components/PredictionConfigPanel";
import { WorldPickerPanel } from "./play/-components/WorldPickerPanel";
import { SpawnPanel } from "./play/-components/SpawnPanel";
import { Button } from "~/components/ui/button";
import { fetchGameServerWorldPickerStats, SELECTED_GAME_SERVER_WS_URL_KEY } from "~/utils/game-server-connect";
import { getGameAuthToken } from "~/fn/game-auth";
import { requireSessionForPlayFn } from "~/fn/guards";
import { authClient } from "~/lib/auth-client";
type GameAuthPhase = "idle" | "loading" | "ok" | "missing";

function parseWorldSearchParam(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const s = typeof value === "string" ? value : String(value);
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1) {
    return undefined;
  }
  return n;
}

// Extend window type for game auth token
declare global {
  interface Window {
    __gameAuthToken?: string | null;
  }
}

export const Route = createFileRoute("/play")({
  beforeLoad: async () => {
    await requireSessionForPlayFn();
  },
  component: Play,
  validateSearch: (search: Record<string, unknown>) => ({
    error: typeof search.error === "string" ? search.error : undefined,
    // `server` accepted for older bookmarks only; prefer `world`.
    world: parseWorldSearchParam(
      search.world !== undefined && search.world !== "" ? search.world : search.server,
    ),
  }),
});

export function meta() {
  return [
    { title: "Survive the Night Game" },
    {
      name: "description",
      content:
        "An online multiplayer game where you must survive the night against hordes of zombies.  Build bases with your friends, collect weapons, and craft items to see how long you'll last.",
    },
  ];
}

// Client-only component that dynamically imports game client code
function GameClientLoader() {
  const navigate = useNavigate();
  const { error: playSearchError, world: bookmarkedWorldId } = Route.useSearch();
  const {
    data: session,
    isPending: sessionPending,
    error: sessionError,
  } = authClient.useSession();
  const authUserId = session?.user?.id ?? null;
  const [gameAuthPhase, setGameAuthPhase] = useState<GameAuthPhase>("idle");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneManagerRef = useRef<any>(null);
  const bootstrappedUserIdRef = useRef<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showSpawnPanel, setShowSpawnPanel] = useState(false);
  const [gameClient, setGameClient] = useState<any>(null);
  const [sceneLoadError, setSceneLoadError] = useState<string | null>(null);
  const [serverRegistry, setServerRegistry] = useState<{
    loaded: boolean;
    servers: Array<{ id: number; displayName: string | null; publicWsUrl: string }>;
  }>({ loaded: false, servers: [] });
  const [serverPickResolved, setServerPickResolved] = useState(false);
  const [serverPings, setServerPings] = useState<Record<number, number | null>>({});
  const [serverPlayerCounts, setServerPlayerCounts] = useState<Record<number, number | null>>({});
  const [bookmarkedWorldNotice, setBookmarkedWorldNotice] = useState<string | null>(null);

  const handleLeaveGame = () => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.destroy();
      delete (window as any).__sceneManager;
    }
    navigate({ to: "/" });
  };

  const playSearchForRetry = () => ({
    ...(playSearchError ? { error: playSearchError } : {}),
    ...(bookmarkedWorldId !== undefined ? { world: bookmarkedWorldId } : {}),
  });

  const handleTryPlayAgain = () => {
    void navigate({
      to: "/play",
      search: playSearchForRetry(),
      replace: true,
    });
  };

  const handleSignOutFromPlay = async () => {
    await authClient.signOut();
    navigate({ to: "/" });
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (sessionPending) return;
    if (!session || sessionError) {
      const redirectTarget =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/play";
      window.location.href = `/sign-in?redirect=${encodeURIComponent(redirectTarget)}`;
    }
  }, [session, sessionPending, sessionError]);

  useEffect(() => {
    if (sessionPending || !authUserId) return;
    if (
      bootstrappedUserIdRef.current === authUserId &&
      gameAuthPhase === "ok" &&
      window.__gameAuthToken
    ) {
      return;
    }

    let cancelled = false;
    setGameAuthPhase("loading");

    getGameAuthToken()
      .then(({ token, displayName }) => {
        if (cancelled) return;
        window.__gameAuthToken = token;
        if (displayName) {
          localStorage.setItem("displayName", displayName);
        }
        if (!token) {
          bootstrappedUserIdRef.current = null;
          setGameAuthPhase("missing");
        } else {
          bootstrappedUserIdRef.current = authUserId;
          setGameAuthPhase("ok");
        }
      })
      .catch(() => {
        if (!cancelled) {
          bootstrappedUserIdRef.current = null;
          setGameAuthPhase("missing");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authUserId, gameAuthPhase, sessionPending]);

  useEffect(() => {
    if (gameAuthPhase !== "ok") {
      setServerRegistry({ loaded: false, servers: [] });
      setServerPickResolved(false);
      setServerPings({});
      setServerPlayerCounts({});
      return;
    }
    let cancelled = false;
    setServerRegistry({ loaded: false, servers: [] });
    setServerPickResolved(false);
    fetch("/api/game/servers/")
      .then((r) => r.json())
      .then((data: { servers?: unknown }) => {
        if (cancelled) return;
        const servers = Array.isArray(data.servers) ? data.servers : [];
        const normalized = servers
          .filter(
            (s): s is { id: number; displayName: string | null; publicWsUrl: string } =>
              s &&
              typeof s === "object" &&
              typeof (s as { id: unknown }).id === "number" &&
              typeof (s as { publicWsUrl: unknown }).publicWsUrl === "string",
          )
          .map((s) => ({
            id: s.id,
            displayName: typeof s.displayName === "string" ? s.displayName : null,
            publicWsUrl: s.publicWsUrl,
          }));
        setServerRegistry({ loaded: true, servers: normalized });
        if (normalized.length === 0) {
          setServerPickResolved(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServerRegistry({ loaded: true, servers: [] });
          setServerPickResolved(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [gameAuthPhase]);

  useEffect(() => {
    if (!serverRegistry.loaded || serverRegistry.servers.length === 0 || serverPickResolved) {
      return;
    }
    let cancelled = false;
    let measureGen = 0;
    let timeoutId: number | undefined;
    const pingSamplesById: Record<number, number[]> = {};
    let completedPolls = 0;

    const average = (values: number[]): number | null => {
      if (values.length === 0) return null;
      return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    };

    const measureOnce = async () => {
      const gen = ++measureGen;
      const rows = await Promise.all(
        serverRegistry.servers.map(async (s) => {
          const { pingMs, playerCount } = await fetchGameServerWorldPickerStats(s.publicWsUrl);
          if (pingMs != null) {
            const prev = pingSamplesById[s.id] ?? [];
            pingSamplesById[s.id] = [...prev, pingMs].slice(-5);
          }
          const avgPing = average(pingSamplesById[s.id] ?? []);
          return [s.id, { ping: avgPing, playerCount }] as const;
        }),
      );
      if (!cancelled && gen === measureGen) {
        setServerPings(Object.fromEntries(rows.map(([id, v]) => [id, v.ping])));
        setServerPlayerCounts(Object.fromEntries(rows.map(([id, v]) => [id, v.playerCount])));
      }
    };

    const scheduleNext = () => {
      if (cancelled) return;
      const delayMs = completedPolls >= 5 ? 5000 : 1000;
      timeoutId = window.setTimeout(runCycle, delayMs);
    };

    const runCycle = () => {
      void (async () => {
        await measureOnce();
        if (cancelled) return;
        completedPolls += 1;
        scheduleNext();
      })();
    };

    void runCycle();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [serverRegistry, serverPickResolved]);

  useEffect(() => {
    if (!serverRegistry.loaded || serverPickResolved) {
      return;
    }
    if (serverRegistry.servers.length === 0) {
      return;
    }
    if (bookmarkedWorldId === undefined) {
      return;
    }
    const row = serverRegistry.servers.find((s) => s.id === bookmarkedWorldId);
    if (!row) {
      return;
    }
    try {
      sessionStorage.setItem(SELECTED_GAME_SERVER_WS_URL_KEY, row.publicWsUrl.trim());
    } catch {
      /* ignore */
    }
    setServerPickResolved(true);
  }, [serverRegistry, bookmarkedWorldId, serverPickResolved]);

  useEffect(() => {
    if (!serverRegistry.loaded || serverRegistry.servers.length === 0) {
      setBookmarkedWorldNotice(null);
      return;
    }
    if (bookmarkedWorldId === undefined || serverPickResolved) {
      setBookmarkedWorldNotice(null);
      return;
    }
    const row = serverRegistry.servers.find((s) => s.id === bookmarkedWorldId);
    setBookmarkedWorldNotice(
      row
        ? null
        : `World id ${bookmarkedWorldId} is not in the list right now — it may be offline or not registered.`,
    );
  }, [serverRegistry, bookmarkedWorldId, serverPickResolved]);

  // Poll for game client once scene manager is loaded
  useEffect(() => {
    if (!isClient || gameAuthPhase !== "ok" || !serverPickResolved) return;

    const pollGameClient = setInterval(() => {
      if (!sceneManagerRef.current) return;

      const currentScene = sceneManagerRef.current.getCurrentScene();

      if (currentScene && typeof currentScene.getGameClient === "function") {
        const client = currentScene.getGameClient();
        if (client) {
          setGameClient(client);
          clearInterval(pollGameClient);
        }
      }
    }, 500);

    return () => clearInterval(pollGameClient);
  }, [isClient, gameAuthPhase, serverPickResolved]);

  // Handle ESC key to close any open panels (but not toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (e.key === "Escape") {
        if (showSpawnPanel) {
          setShowSpawnPanel(false);
          return;
        }
      }

      if (isInputField) {
        return;
      }

      if (gameClient && gameClient.isChatting && gameClient.isChatting()) {
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [gameClient, showSpawnPanel]);

  useEffect(() => {
    if (!isClient || gameAuthPhase !== "ok" || !serverPickResolved || !canvasRef.current) {
      return;
    }
    if (sceneManagerRef.current) {
      return;
    }

    setSceneLoadError(null);
    // @ts-ignore — workspace package
    import("@survive-the-night/game-client/scenes")
      .then(({ SceneManager, LoadingScene }) => {
        if (!canvasRef.current) {
          return;
        }

        sceneManagerRef.current = new SceneManager(canvasRef.current, {
          onRequestExitGame: handleLeaveGame,
        });

        (window as any).__sceneManager = sceneManagerRef.current;

        void sceneManagerRef.current.switchScene(LoadingScene);
      })
      .catch((err: unknown) => {
        console.error("Failed to load game client:", err);
        const message = err instanceof Error ? err.message : String(err);
        setSceneLoadError(message || "Failed to load game");
      });
  }, [isClient, gameAuthPhase, serverPickResolved]);

  useEffect(() => {
    return () => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.destroy();
        sceneManagerRef.current = null;
        delete (window as any).__sceneManager;
      }
    };
  }, []);

  if (sessionPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session || sessionError) {
    return null;
  }

  if (playSearchError === "duplicateSession") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white">
        <h1 className="text-xl font-semibold">Already playing</h1>
        <p className="max-w-lg text-muted-foreground text-sm">
          Your account already has an active game session open (for example in another browser tab or on
          another device). Only one session is allowed at a time. Close the other session or sign out there,
          then try again.
        </p>
        <p className="max-w-lg text-muted-foreground text-xs">
          If you are sure nothing else is running, wait a few minutes — stale locks clear automatically after
          inactivity — then use Try again. If your operator uses fixed world ids, a world restart
          usually clears stale locks on the next boot.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" onClick={handleTryPlayAgain}>
            Try again
          </Button>
          <Button type="button" variant="secondary" onClick={handleSignOutFromPlay}>
            Sign out
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (gameAuthPhase === "idle" || gameAuthPhase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (gameAuthPhase === "missing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white">
        <h1 className="text-xl font-semibold">Game login is not available</h1>
        <p className="max-w-md text-muted-foreground">
          The server could not issue a game session token. This usually means{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-foreground">GAME_SERVER_API_KEY</code> is
          not set in the website environment, or it does not match the game server&apos;s key. Set
          the same secret in both services and reload.
        </p>
        <Link to="/" className="text-primary underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (gameAuthPhase === "ok" && !serverRegistry.loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (
    gameAuthPhase === "ok" &&
    serverRegistry.loaded &&
    !serverPickResolved &&
    serverRegistry.servers.length > 0
  ) {
    return (
      <WorldPickerPanel
        worlds={serverRegistry.servers}
        pings={serverPings}
        playerCounts={serverPlayerCounts}
        bookmarkNotice={bookmarkedWorldNotice}
        onContinueWithSelection={({ publicWsUrl, worldId }) => {
          try {
            sessionStorage.setItem(SELECTED_GAME_SERVER_WS_URL_KEY, publicWsUrl.trim());
          } catch {
            /* ignore quota / private mode */
          }
          void navigate({
            to: "/play",
            search: (prev) => ({
              error: prev.error,
              world: worldId,
            }),
            replace: true,
          });
          setServerPickResolved(true);
        }}
      />
    );
  }

  if (gameAuthPhase === "ok" && sceneLoadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <h1 className="text-xl font-semibold">Could not start the game</h1>
        <p className="max-w-lg text-muted-foreground text-sm break-words">{sceneLoadError}</p>
        <p className="max-w-md text-muted-foreground text-sm">
          Check the browser console for details. Try a hard refresh or rebuild the app.
        </p>
        <Link to="/" className="text-primary underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-black">
      <canvas
        ref={canvasRef}
        className="block h-full w-full max-h-screen max-w-full"
        style={{ minHeight: "100vh", minWidth: "100vw" }}
      />

      {import.meta.env.VITE_LOCAL === "true" && (
        <>
          <div className="fixed left-4 top-4 z-[10000] flex items-start gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSpawnPanel(!showSpawnPanel)}
              className="bg-purple-600 text-white hover:bg-purple-700 text-2xl"
              title="Spawn Items Panel"
            >
              {"\u{1F381}"}
            </Button>
            <PredictionConfigPanel />
          </div>
          <SpawnPanel
            gameClient={gameClient}
            isOpen={showSpawnPanel}
            onToggle={() => setShowSpawnPanel(!showSpawnPanel)}
          />
        </>
      )}
    </div>
  );
}

function Play() {
  return <GameClientLoader />;
}
