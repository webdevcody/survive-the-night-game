import { RawEntity } from "@survive-the-night/game-shared/src/types/entity";

export type GameState = {
  entities: RawEntity[];
  dayNumber: number;
  untilNextCycle: number;
  isDay: boolean;
};
