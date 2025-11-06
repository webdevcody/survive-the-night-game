import { Direction } from "./direction";
import { ItemType } from "./inventory";

export type Input = {
  facing: Direction;
  dx: number;
  dy: number;
  interact: boolean;
  fire: boolean;
  inventoryItem: number;
  drop: boolean;
  consume: boolean;
  consumeItemType: ItemType | null;
  sprint: boolean;
  sequenceNumber?: number; // Optional: sequence number for client-side prediction rollback
};
