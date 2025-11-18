// Re-export from core/server.ts for backward compatibility with build scripts
export { GameServer } from "./core/server";

// Start the server (main entry point)
import { GameServer } from "./core/server";
import { ServerUpdatingEvent } from "@shared/events/server-sent/server-updating-event";

const gameServer = new GameServer();

process.on("SIGINT", () => gameServer.stop());
process.on("SIGTERM", () => {
  console.log("Server updating...");
  gameServer.broadcastEvent(new ServerUpdatingEvent());
  gameServer.stop();
});
