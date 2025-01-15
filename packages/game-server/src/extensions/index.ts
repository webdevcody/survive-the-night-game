import Collidable from "./collidable";
import Consumable from "./consumable";
import Destructible from "./destructible";
import Expirable from "./expirable";
import Interactive from "./interactive";
import Positionable from "./positionable";
import Triggerable from "./trigger";
import TriggerCooldownAttacker from "./trigger-cooldown-attacker";
import Updatable from "./updatable";
import Inventory from "./inventory";
import Ignitable from "./ignitable";
import Movable from "./movable";
import Combustible from "./combustible";
import Illuminated from "./illuminated";
import Carryable from "./carryable";
import Groupable from "./groupable";

export const extensionsMap = {
  [Collidable.type]: Collidable,
  [Consumable.type]: Consumable,
  [Destructible.type]: Destructible,
  [Interactive.type]: Interactive,
  [Positionable.type]: Positionable,
  [Triggerable.type]: Triggerable,
  [Updatable.type]: Updatable,
  [TriggerCooldownAttacker.type]: TriggerCooldownAttacker,
  [Expirable.type]: Expirable,
  [Inventory.type]: Inventory,
  [Ignitable.type]: Ignitable,
  [Movable.type]: Movable,
  [Combustible.type]: Combustible,
  [Illuminated.type]: Illuminated,
  [Carryable.type]: Carryable,
  [Groupable.type]: Groupable,
} as const;
