import Vector2 from "@/util/vector2";
import { EntityType } from "../types/entity";
import { ItemType } from "../util/inventory";

export const ADMIN_COMMANDS = {
  CREATE_ITEM: "createItem",
  CREATE_ENTITY: "createEntity",
} as const;

export type AdminCommandType = (typeof ADMIN_COMMANDS)[keyof typeof ADMIN_COMMANDS];

export type AdminCommand = {
  command: AdminCommandType;
  payload: any;
};

export type CreateItemCommand = {
  command: "createItem";
  payload: {
    itemType: ItemType;
    position: Vector2;
  };
};

export type CreateEntityCommand = {
  command: "createEntity";
  payload: {
    entityType: EntityType;
    position: Vector2;
  };
};
