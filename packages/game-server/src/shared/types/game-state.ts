import { RawEntity } from "../entities";

export type GameState = {
  entities: RawEntity[];
  dayNumber: number;
  untilNextCycle: number;
  isDay: boolean;
};
