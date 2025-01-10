import { Entities } from "../constants";

export interface Extension {
  serialize: () => ExtensionSerialized;
}

export type ExtensionCtor<T = any> = { new (...args: any[]): T };

export interface ExtensionSerialized {
  type: string;
  [key: string]: any;
}

export interface RawEntity {
  id: string;
  type: EntityType;
  extensions?: ExtensionSerialized[];
  [key: string]: any;
}

export type EntityType = (typeof Entities)[keyof typeof Entities];
