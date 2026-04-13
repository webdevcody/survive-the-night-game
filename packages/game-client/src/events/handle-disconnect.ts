import { clearEntities } from "@/state";
import { ClientEventContext } from "./types";

export const handleDisconnect = (context: ClientEventContext) => {
  // Initialization flags are handled in the main class via callbacks or state updates if needed
  // But here we handle side effects

  // Stop the game until we're re-initialized
  context.gameClient.stop();

  // Clear entities to prevent stale state
  clearEntities(context.gameState);

  // Clear spatial grid to remove stale entity references
  context.gameClient.getRenderer().clearSpatialGrid();

  if (context.socketManager.getShouldReconnect()) {
    context.gameClient.getHud().addMessage("Disconnected from server. Reconnecting...", "yellow");
  }
};
