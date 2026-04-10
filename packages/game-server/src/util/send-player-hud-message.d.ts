import type { IGameManagers } from "@/managers/types";
/** Transient HUD line for one player (server `GameMessageEvent` → client `onGameMessage` → `Hud.addMessage`). */
export declare function sendPlayerHudMessage(gameManagers: IGameManagers, playerEntityId: number, message: string, color?: string): void;
