import Vector2 from "@/util/vector2";
import { EntityType } from "../types/entity";
import { ItemType } from "../util/inventory";

export const SKIN_TYPES = {
  DEFAULT: "default",
  WDC: "wdc",
  ZOMBIE: "zombie",
} as const;

export type SkinType = (typeof SKIN_TYPES)[keyof typeof SKIN_TYPES];

// Player color options - 12 vivid preset colors
export const PLAYER_COLORS = {
  NONE: "none", // No color tint (original sprite)
  RED: "red",
  ORANGE: "orange",
  YELLOW: "yellow",
  LIME: "lime",
  GREEN: "green",
  CYAN: "cyan",
  BLUE: "blue",
  PURPLE: "purple",
  MAGENTA: "magenta",
  PINK: "pink",
  BROWN: "brown",
  GRAY: "gray",
} as const;

export type PlayerColor = (typeof PLAYER_COLORS)[keyof typeof PLAYER_COLORS];

// Color hex values for rendering
export const PLAYER_COLOR_HEX: Record<PlayerColor, string> = {
  none: "#FFFFFF",
  red: "#FF4444",
  orange: "#FF8844",
  yellow: "#FFFF44",
  lime: "#88FF44",
  green: "#44FF44",
  cyan: "#44FFFF",
  blue: "#4488FF",
  purple: "#8844FF",
  magenta: "#FF44FF",
  pink: "#FF88BB",
  brown: "#AA6644",
  gray: "#888888",
};

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
    playerId: number;
  };
  password: string;
};
