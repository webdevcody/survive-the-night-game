import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientCarryable } from "@/extensions/carryable";
import { ClientCollidable } from "@/extensions/collidable";
import { ClientCombustible } from "@/extensions/combustible";
import { ClientConsumable } from "@/extensions/consumable";
import { ClientDestructible } from "@/extensions/destructible";
import { ClientExpirable } from "@/extensions/expirable";
import { ClientGroupable } from "@/extensions/groupable";
import { ClientIgnitable } from "@/extensions/ignitable";
import { ClientIlluminated } from "@/extensions/illuminated";
import { ClientInteractive } from "@/extensions/interactive";
import { ClientInventory } from "@/extensions/inventory";
import { ClientMovable } from "@/extensions/movable";
import { ClientPositionable } from "@/extensions/positionable";
import { ClientTriggerCooldownAttacker } from "@/extensions/trigger-cooldown-attacker";
import { ClientTriggerable } from "@/extensions/triggerable";
import { ClientUpdatable } from "@/extensions/updatable";
import { ClientOneTimeTrigger } from "./one-time-trigger";

export const clientExtensionsMap = {
  [ExtensionTypes.POSITIONABLE]: ClientPositionable,
  [ExtensionTypes.MOVABLE]: ClientMovable,
  [ExtensionTypes.DESTRUCTIBLE]: ClientDestructible,
  [ExtensionTypes.ILLUMINATED]: ClientIlluminated,
  [ExtensionTypes.IGNITABLE]: ClientIgnitable,
  [ExtensionTypes.INTERACTIVE]: ClientInteractive,
  [ExtensionTypes.COLLIDABLE]: ClientCollidable,
  [ExtensionTypes.CONSUMABLE]: ClientConsumable,
  [ExtensionTypes.CARRYABLE]: ClientCarryable,
  [ExtensionTypes.COMBUSTIBLE]: ClientCombustible,
  [ExtensionTypes.GROUPABLE]: ClientGroupable,
  [ExtensionTypes.INVENTORY]: ClientInventory,
  [ExtensionTypes.TRIGGERABLE]: ClientTriggerable,
  [ExtensionTypes.UPDATABLE]: ClientUpdatable,
  [ExtensionTypes.EXPIRABLE]: ClientExpirable,
  [ExtensionTypes.TRIGGER_COOLDOWN_ATTACKER]: ClientTriggerCooldownAttacker,
  [ExtensionTypes.ONE_TIME_TRIGGER]: ClientOneTimeTrigger,
} as const;

export {
  ClientPositionable,
  ClientMovable,
  ClientDestructible,
  ClientIlluminated,
  ClientIgnitable,
  ClientInteractive,
  ClientCollidable,
  ClientConsumable,
  ClientCarryable,
  ClientCombustible,
  ClientGroupable,
  ClientInventory,
  ClientTriggerable,
  ClientUpdatable,
  ClientExpirable,
  ClientTriggerCooldownAttacker,
  ClientOneTimeTrigger,
};
