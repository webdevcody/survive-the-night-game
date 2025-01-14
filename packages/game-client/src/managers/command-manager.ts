import { ItemType, Vector2 } from "@survive-the-night/game-server";
import { ClientSocketManager } from "./client-socket-manager";
import { ADMIN_COMMANDS } from "@shared/commands/commands";
import { GameState, getEntityById } from "@/state";
import { ClientPositionable } from "@/extensions";

export class CommandManager {
  private socketManager: ClientSocketManager;
  private gameState: GameState;

  constructor(socketManager: ClientSocketManager, gameState: GameState) {
    this.socketManager = socketManager;
    this.gameState = gameState;
  }

  public createItem(itemType: ItemType, position: Vector2) {
    const player = getEntityById(this.gameState, this.gameState.playerId);
    if (!player) return;

    const positionable = player.getExt(ClientPositionable);

    this.socketManager.sendAdminCommand({
      command: ADMIN_COMMANDS.CREATE_ITEM,
      payload: { itemType, position: positionable.getCenterPosition() },
    });
  }
}
