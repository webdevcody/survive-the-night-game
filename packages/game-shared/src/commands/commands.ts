import { Vector2 } from "@shared/math";

export const ADMIN_COMMANDS = {
  CREATE_ITEM: "createItem",
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
