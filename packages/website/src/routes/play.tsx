import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PredictionConfigPanel } from "./play/-components/PredictionConfigPanel";
import { SpawnPanel } from "./play/-components/SpawnPanel";
import { Button } from "~/components/ui/button";
import { getGameAuthToken } from "~/fn/game-auth";
import { authClient } from "~/lib/auth-client";
type GameAuthPhase = "idle" | "loading" | "ok" | "missing";

// Extend window type for game auth token
declare global {
  interface Window {
    __gameAuthToken?: string | null;
  }
}

export const Route = createFileRoute("/play")({
  component: Play,
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
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const authUserId = session?.user?.id ?? null;
  const [gameAuthPhase, setGameAuthPhase] = useState<GameAuthPhase>("idle");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneManagerRef = useRef<any>(null);
  const bootstrappedUserIdRef = useRef<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showSpawnPanel, setShowSpawnPanel] = useState(false);
  const [gameClient, setGameClient] = useState<any>(null);
  const [sceneLoadError, setSceneLoadError] = useState<string | null>(null);

  const handleLeaveGame = () => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.destroy();
      delete (window as any).__sceneManager;
    }
    navigate({ to: "/" });
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!sessionPending && !session) {
      window.location.href = "/sign-in?redirect=/play";
    }
  }, [session, sessionPending]);

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

  // Poll for game client once scene manager is loaded
  useEffect(() => {
    if (!isClient || gameAuthPhase !== "ok") return;

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
  }, [isClient, gameAuthPhase]);

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
    if (!isClient || gameAuthPhase !== "ok" || !canvasRef.current) {
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
  }, [isClient, gameAuthPhase]);

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

  if (!session) {
    return null;
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
