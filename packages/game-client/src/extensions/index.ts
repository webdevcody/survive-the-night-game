import { ExtensionTypes } from "@survive-the-night/game-server/src/shared/extension-types";
import { ClientPositionable } from "./positionable";
import { ClientMovable } from "./movable";
import { ClientDestructible } from "./destructible";
import { ClientIlluminated } from "./illuminated";
import { ClientIgnitable } from "./ignitable";
import { ClientInteractive } from "./interactive";
import { ClientCollidable } from "./collidable";
import { ClientConsumable } from "./consumable";
import { ClientCarryable } from "./carryable";
import { ClientCombustible } from "./combustible";
import { ClientGroupable } from "./groupable";
import { ClientInventory } from "./inventory";
import { ClientTriggerable } from "./triggerable";
import { ClientUpdatable } from "./updatable";
import { ClientExpirable } from "./expirable";
import { ClientTriggerCooldownAttacker } from "./trigger-cooldown-attacker";

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
