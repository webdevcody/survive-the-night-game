import { ClientSocketManager } from "./client-socket-manager";
import { ADMIN_COMMANDS } from "@shared/commands/commands";
import { GameState, getEntityById } from "@/state";
import { ClientPositionable } from "@/extensions";
import { EntityType } from "@shared/types/entity";
import { ItemType } from "@server/shared/inventory";

export class CommandManager {
  private socketManager: ClientSocketManager;
  private gameState: GameState;

  constructor(socketManager: ClientSocketManager, gameState: GameState) {
    this.socketManager = socketManager;
    this.gameState = gameState;
  }

  public createItem(itemType: ItemType) {
    const player = getEntityById(this.gameState, this.gameState.playerId);
    if (!player) return;

    const positionable = player.getExt(ClientPositionable);

    this.socketManager.sendAdminCommand({
      command: ADMIN_COMMANDS.CREATE_ITEM,
      payload: { itemType, position: positionable.getCenterPosition() },
    });
  }

  public createEntity(entityType: EntityType) {
    const player = getEntityById(this.gameState, this.gameState.playerId);
    if (!player) return;

    const positionable = player.getExt(ClientPositionable);
    this.socketManager.sendAdminCommand({
      command: ADMIN_COMMANDS.CREATE_ENTITY,
      payload: { entityType, position: positionable.getCenterPosition() },
    });
  }
}
