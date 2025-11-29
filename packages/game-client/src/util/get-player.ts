import { PlayerClient } from "@/entities/player";
import { GameState, getEntityById } from "@/state";

export function getPlayer(gameState: GameState): PlayerClient | null {
  if (!gameState.playerId) {
    return null;
  }

  const entity = getEntityById(gameState, gameState.playerId);

  // Validate that entity exists and is actually a PlayerClient
  // During death/respawn transitions, the entity may be temporarily undefined
  // or may be a different entity type
  if (!entity || !(entity instanceof PlayerClient)) {
    return null;
  }

  return entity;
}
