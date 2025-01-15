import { ExtensionTypes } from "@shared/geom/extension-types";
import { ClientCarryable } from "./carryable";
import { ClientCollidable } from "./collidable";
import { ClientCombustible } from "./combustible";
import { ClientConsumable } from "./consumable";
import { ClientDestructible } from "./destructible";
import { ClientExpirable } from "./expirable";
import { ClientGroupable } from "./groupable";
import { ClientIgnitable } from "./ignitable";
import { ClientIlluminated } from "./illuminated";
import { ClientInteractive } from "./interactive";
import { ClientInventory } from "./inventory";
import { ClientMovable } from "./movable";
import { ClientPositionable } from "./positionable";
import { ClientTriggerCooldownAttacker } from "./trigger-cooldown-attacker";
import { ClientTriggerable } from "./triggerable";
import { ClientUpdatable } from "./updatable";

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
};
