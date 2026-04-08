import type { GameModeId } from "@shared/events/server-sent/events/game-started-event";
import { IGameModeStrategy } from "./game-mode-strategy";
import { BattleRoyaleModeStrategy } from "./battle-royale-mode-strategy";
import { InfectionModeStrategy } from "./infection-mode-strategy";
import { OpenWorldModeStrategy } from "./open-world-mode-strategy";

export function createGameModeStrategy(mode: GameModeId): IGameModeStrategy {
  switch (mode) {
    case "battle_royale":
      return new BattleRoyaleModeStrategy();
    case "infection":
      return new InfectionModeStrategy();
    case "open_world":
    default:
      return new OpenWorldModeStrategy();
  }
}
