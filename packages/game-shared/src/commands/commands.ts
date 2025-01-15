import { Vector2 } from "@shared/math";
import { EntityType } from "../types/entity";

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
  command: AdminCommandType.CREATE_ITEM;
  payload: {
    itemType: ItemType;
    position: Vector2;
  };
};

export type CreateEntityCommand = {
  command: AdminCommandType.CREATE_ENTITY;
  payload: {
    entityType: EntityType;
    position: Vector2;
  };
};
