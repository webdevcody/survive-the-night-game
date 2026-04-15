// Re-export from core/server.ts for backward compatibility with build scripts
export { GameServer } from "./core/server";

// Start the server (main entry point)
import { GameServer } from "./core/server";

async function main() {
  const gameServer = new GameServer();
  await gameServer.bootstrap();

  let shutdownStarted = false;
  const shutdown = async (signal: string) => {
    if (shutdownStarted) {
      return;
    }
    shutdownStarted = true;
    console.log(`[${signal}] graceful shutdown…`);
    try {
      await gameServer.gracefulShutdown();
    } catch (e) {
      console.warn(`[${signal}] gracefulShutdown failed:`, e);
    }
    gameServer.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
