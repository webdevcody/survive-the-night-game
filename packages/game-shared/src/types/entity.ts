import { Entities } from "../constants";

export interface Extension {
  serialize: () => ExtensionSerialized;
}

export interface ExtensionSerialized {
  type: string;
  [key: string]: any;
}

export interface RawEntity {
  id: number;
  type: EntityType;
  extensions?: ExtensionSerialized[];
  removedExtensions?: string[]; // Array of extension types that were removed
  [key: string]: any;
}

export type EntityType = (typeof Entities)[keyof typeof Entities];

export interface ItemState {
  count?: number;
  health?: number;
}
