import { GameStartedEvent } from "../../../game-shared/src/events/server-sent/events/game-started-event";
import { clearEntities } from "@/state";
import { ClientEventContext } from "./types";

export const onGameStarted = (context: ClientEventContext, event: GameStartedEvent) => {
  // Clear all client-side entities and particles
  clearEntities(context.gameState);
  context.gameClient.getParticleManager().clear();

  // Hide game over dialog if it was showing
  context.gameClient.getGameOverDialog().hide();

  // Show welcome message
  context.gameClient
    .getHud()
    .addMessage("The car is our only way out... don't let them destroy it!", "yellow");

  // Request full state from server
  context.socketManager.sendRequestFullState();
};
