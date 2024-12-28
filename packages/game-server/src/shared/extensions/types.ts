export const ExtensionNames = {
  collidable: "collidable",
  consumable: "consumable",
  destructible: "destructible",
  interactive: "interactive",
  positionable: "positionable",
  trigger: "trigger",
  updatable: "updatable",
  triggerCooldownAttacker: "triggerCooldownAttacker",
  expirable: "expirable",
  inventory: "inventory",
  ignitable: "ignitable",
  movable: "movable"
} as const;

export interface Extension {
  deserialize: (data: ExtensionSerialized) => this;
  serialize: () => ExtensionSerialized;
  update?: (deltaTime: number) => void;
}

export type ExtensionCtor<T = any> = { new(...args: any[]): T };

export interface ExtensionSerialized {
  name: keyof typeof ExtensionNames;
  [key: string]: any;
}
