import { EntityType } from "./entity-types";
export { Entities } from "./entity-types";

export type RawEntity = {
  id: string;
  type: EntityType;
  [key: string]: any;
};


