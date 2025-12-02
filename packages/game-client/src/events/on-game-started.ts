import { GameStartedEvent } from "../../../game-shared/src/events/server-sent/events/game-started-event";
import { clearEntities } from "@/state";
import { InitializationContext } from "./types";

export const onGameStarted = (context: InitializationContext, event: GameStartedEvent) => {
  const data = event.getData();

  // Clear all client-side entities, particles, and spatial references
  clearEntities(context.gameState);
  context.gameClient.getParticleManager().clear();
  context.gameClient.getRenderer().clearSpatialGrid();

  // Hide game over dialog if it was showing
  context.gameClient.getGameOverDialog().hide();

  // Reset voting state
  context.gameState.votingState = null;
  context.gameClient.getVotingPanel().reset();

  // Reset zombie lives state (infection mode only)
  context.gameState.zombieLivesState = null;

  // Set game mode from server
  context.gameState.gameMode = data.gameMode;

  // Show welcome message based on game mode
  if (data.gameMode === "battle_royale") {
    context.gameClient.getHud().addMessage("Battle Royale - Last one standing wins!", "gold");
  } else {
    context.gameClient
      .getHud()
      .addMessage("The car is our only way out... don't let them destroy it!", "yellow");
  }

  // Reset initialization and request fresh player ID + full game state
  // Players get new entity IDs when a new game starts, so we need both
  context.resetAndRequestInitialization("GameStarted event");
};
