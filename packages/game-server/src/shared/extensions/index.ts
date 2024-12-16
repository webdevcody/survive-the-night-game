import Consumable from "./consumable";
import Interactive from "./interactive";
import Positionable from "./positionable";

export const extensionsMap = {
  [Consumable.Name]: Consumable,
  [Interactive.Name]: Interactive,
  [Positionable.Name]: Positionable,
} as const;

export { Consumable, Interactive, Positionable };
export * from "./types";
