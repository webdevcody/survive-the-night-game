import Collidable from "./collidable";
import Consumable from "./consumable";
import Destructible from "./destructible";
import Interactive from "./interactive";
import Positionable from "./positionable";

export const extensionsMap = {
  [Collidable.Name]: Collidable,
  [Consumable.Name]: Consumable,
  [Destructible.Name]: Destructible,
  [Interactive.Name]: Interactive,
  [Positionable.Name]: Positionable,
} as const;

export { Collidable, Consumable, Destructible, Interactive, Positionable };
export * from "./types";
