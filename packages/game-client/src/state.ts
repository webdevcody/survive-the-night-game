import { Entity } from "@survive-the-night/game-server";

export type GameState = {
  playerId: string;
  entities: Entity[];
  dayNumber: number;
  untilNextCycle: number;
  isDay: boolean;
};

export function getEntityById(gameState: GameState, id: string): Entity | undefined {
  return gameState.entities.find((entity) => {
    return entity.getId() === id;
  });
}
