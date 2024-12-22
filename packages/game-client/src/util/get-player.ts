import { GameState, getEntityById } from "../state";
import { PlayerClient } from "../entities/player";

export function getPlayer(gameState: GameState): PlayerClient | null {
  if (!gameState.playerId) {
    return null;
  }

  return getEntityById(gameState, gameState.playerId) as unknown as PlayerClient;
}
