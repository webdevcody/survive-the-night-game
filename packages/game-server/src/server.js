// Re-export from core/server.ts for backward compatibility with build scripts
export { GameServer } from "./core/server";
// Start the server (main entry point)
import { GameServer } from "./core/server";
import { ServerUpdatingEvent } from "../../game-shared/src/events/server-sent/events/server-updating-event";
async function main() {
    const gameServer = new GameServer();
    await gameServer.bootstrap();
    process.on("SIGINT", async () => {
        try {
            await gameServer.persistConnectedPlayersLastPositions();
        }
        catch (e) {
            console.warn("[SIGINT] persist player positions failed:", e);
        }
        gameServer.stop();
    });
    process.on("SIGTERM", async () => {
        console.log("Server updating...");
        try {
            await gameServer.persistConnectedPlayersLastPositions();
        }
        catch (e) {
            console.warn("[SIGTERM] persist player positions failed:", e);
        }
        gameServer.broadcastEvent(new ServerUpdatingEvent());
        gameServer.stop();
    });
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
