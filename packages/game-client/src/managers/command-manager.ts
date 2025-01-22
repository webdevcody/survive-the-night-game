import { ClientSocketManager } from "@/managers/client-socket-manager";
import { ADMIN_COMMANDS, SkinType } from "@shared/commands/commands";
import { GameState, getEntityById } from "@/state";
import { ClientPositionable } from "@/extensions";
import { EntityType } from "@shared/types/entity";
import { ItemType } from "../../../game-shared/src/util/inventory";
import { AdminCommand, ChangeSkinCommand } from "@shared/commands/commands";

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

  public changeSkin(skinType: SkinType) {
    const command: ChangeSkinCommand = {
      command: ADMIN_COMMANDS.CHANGE_SKIN,
      payload: {
        skinType,
        playerId: this.gameState.playerId,
      },
    };
    this.socketManager.sendAdminCommand(command);
  }
}
