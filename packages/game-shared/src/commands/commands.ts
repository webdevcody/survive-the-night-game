import Vector2 from "@/util/vector2";
import { EntityType } from "../types/entity";
import { ItemType } from "../util/inventory";

export const SKIN_TYPES = {
  DEFAULT: "default",
  WDC: "wdc",
} as const;

export type SkinType = (typeof SKIN_TYPES)[keyof typeof SKIN_TYPES];

export const ADMIN_COMMANDS = {
  CREATE_ITEM: "createItem",
  CREATE_ENTITY: "createEntity",
  CHANGE_SKIN: "changeSkin",
} as const;

export type AdminCommandType = (typeof ADMIN_COMMANDS)[keyof typeof ADMIN_COMMANDS];

export type AdminCommand = {
  command: AdminCommandType;
  payload: any;
  password: string;
};

export type CreateItemCommand = {
  command: "createItem";
  payload: {
    itemType: ItemType;
    position: Vector2;
  };
  password: string;
};

export type CreateEntityCommand = {
  command: "createEntity";
  payload: {
    entityType: EntityType;
    position: Vector2;
  };
  password: string;
};

export type ChangeSkinCommand = {
  command: "changeSkin";
  payload: {
    skinType: SkinType;
    playerId: string;
  };
  password: string;
};
