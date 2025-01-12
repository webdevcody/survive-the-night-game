import { ClientEntityBase } from "./extensions/client-entity";

export type GameState = {
  startedAt: number;
  playerId: string;
  entities: ClientEntityBase[];
  dayNumber: number;
  untilNextCycle: number;
  isDay: boolean;
  crafting: boolean;
};

export function getEntityById(gameState: GameState, id: string): ClientEntityBase | undefined {
  return gameState.entities.find((entity) => {
    return entity.getId() === id;
  });
}
