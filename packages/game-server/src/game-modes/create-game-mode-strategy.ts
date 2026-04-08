import { IGameModeStrategy } from "./game-mode-strategy";
import { OpenWorldModeStrategy } from "./open-world-mode-strategy";

export function createGameModeStrategy(): IGameModeStrategy {
  return new OpenWorldModeStrategy();
}
