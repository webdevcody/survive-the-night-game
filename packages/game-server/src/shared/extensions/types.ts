export const ExtensionNames = {
  collidable: "collidable",
  consumable: "consumable",
  destructible: "destructible",
  interactive: "interactive",
  positionable: "positionable",
} as const;

export interface Extension {
  deserialize: (data: ExtensionSerialized) => this;
  serialize: () => ExtensionSerialized;
}

export type ExtensionCtor<T = any> = { new (...args: any[]): T };

export interface ExtensionSerialized {
  name: keyof typeof ExtensionNames;
  [key: string]: any;
}
