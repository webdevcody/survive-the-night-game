import { RawEntity } from "@shared/types/entity";

export type GameState = {
  entities: RawEntity[];
  dayNumber: number;
  untilNextCycle: number;
  isDay: boolean;
};
