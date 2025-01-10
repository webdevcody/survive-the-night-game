import { RawEntity } from "@survive-the-night/game-shared";

export type GameState = {
  entities: RawEntity[];
  dayNumber: number;
  untilNextCycle: number;
  isDay: boolean;
};
