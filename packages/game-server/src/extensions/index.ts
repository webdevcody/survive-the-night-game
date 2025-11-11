import Collidable from "@/extensions/collidable";
import Consumable from "@/extensions/consumable";
import Destructible from "@/extensions/destructible";
import Expirable from "@/extensions/expirable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Triggerable from "@/extensions/trigger";
import TriggerCooldownAttacker from "@/extensions/trigger-cooldown-attacker";
import Updatable from "@/extensions/updatable";
import Inventory from "@/extensions/inventory";
import Ignitable from "@/extensions/ignitable";
import Movable from "@/extensions/movable";
import Combustible from "@/extensions/combustible";
import Illuminated from "@/extensions/illuminated";
import Carryable from "@/extensions/carryable";
import Groupable from "@/extensions/groupable";
import Snared from "@/extensions/snared";

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
  [Snared.type]: Snared,
} as const;
