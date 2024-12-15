import { Direction } from "./direction";

export type Input = {
  facing: Direction;
  dx: number;
  dy: number;
  interact: boolean;
  fire: boolean;
  inventoryItem: number;
  drop: boolean;
  consume: boolean;
};
