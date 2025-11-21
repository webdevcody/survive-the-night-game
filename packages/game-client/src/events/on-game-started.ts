import { GameStartedEvent } from "../../../game-shared/src/events/server-sent/events/game-started-event";
import { clearEntities } from "@/state";
import { InitializationContext } from "./types";

export const onGameStarted = (context: InitializationContext, event: GameStartedEvent) => {
  console.log("[GameStarted] Server announced a new round – resetting client state");

  // Invalidate current state and wait for a new full snapshot
  context.invalidateInitialState("Server broadcast GAME_STARTED");

  // Clear all client-side entities, particles, and spatial references
  clearEntities(context.gameState);
  context.gameClient.getParticleManager().clear();
  context.gameClient.getRenderer().clearSpatialGrid();

  // Hide game over dialog if it was showing
  context.gameClient.getGameOverDialog().hide();

  // Show welcome message
  context.gameClient
    .getHud()
    .addMessage("The car is our only way out... don't let them destroy it!", "yellow");

  // Request a fresh full state now that the game restarted
  context.requestFullState("GameStarted event");
};
