import { Entity } from "@survive-the-night/game-server";
import { HotbarClient } from "./ui/hotbar";

export type GameState = {
  playerId: string;
  entities: Entity[];
};

export function getEntityById(gameState: GameState, id: string): Entity | undefined {
  return gameState.entities.find((entity) => {
    return entity.getId() === id;
  });
}
