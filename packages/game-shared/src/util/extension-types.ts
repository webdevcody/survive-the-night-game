export const ExtensionTypes = {
  POSITIONABLE: "positionable",
  COLLIDABLE: "collidable",
  CONSUMABLE: "consumable",
  DESTRUCTIBLE: "destructible",
  INTERACTIVE: "interactive",
  TRIGGERABLE: "triggerable",
  UPDATABLE: "updatable",
  TRIGGER_COOLDOWN_ATTACKER: "trigger-cooldown-attacker",
  EXPIRABLE: "expirable",
  INVENTORY: "inventory",
  IGNITABLE: "ignitable",
  MOVABLE: "movable",
  COMBUSTIBLE: "combustible",
  ILLUMINATED: "illuminated",
  CARRYABLE: "carryable",
  GROUPABLE: "groupable",
  LANDMINE_UPDATE: "landmine-update",
  ONE_TIME_TRIGGER: "one-time-trigger",
} as const;

export type ExtensionType = (typeof ExtensionTypes)[keyof typeof ExtensionTypes];
