import { PlayerClient } from "@/entities/player";
import { GameState, getEntityById } from "@/state";

export function getPlayer(gameState: GameState): PlayerClient | null {
  if (!gameState.playerId) {
    return null;
  }

  return getEntityById(gameState, gameState.playerId) as PlayerClient;
}
