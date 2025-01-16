import { RawEntity } from "../types/entity";

export type GameState = {
  entities: RawEntity[];
  dayNumber: number;
  untilNextCycle: number;
  isDay: boolean;
};
