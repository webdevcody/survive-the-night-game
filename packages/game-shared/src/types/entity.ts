import { Entities } from "../constants";

export interface Extension {
  serialize: () => ExtensionSerialized;
}

export interface RawEntity {
  id: string;
  type: EntityType;
  extensions?: ExtensionSerialized[];
  [key: string]: any;
}

export type EntityType = (typeof Entities)[keyof typeof Entities];

export interface ItemState {
  count?: number;
  health?: number;
}
