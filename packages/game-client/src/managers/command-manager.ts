import { ClientSocketManager } from "@/managers/client-socket-manager";
import { ADMIN_COMMANDS, SkinType } from "@shared/commands/commands";
import { GameState, getEntityById } from "@/state";
import { ClientPositionable } from "@/extensions";
import { EntityType } from "@shared/types/entity";
import { ItemType } from "../../../game-shared/src/util/inventory";
import { AdminCommand, ChangeSkinCommand } from "@shared/commands/commands";
import { StorageManager } from "@/managers/storage";

const ADMIN_PASSWORD_KEY = "admin_password";

export class CommandManager {
  private socketManager: ClientSocketManager;
  private gameState: GameState;
  private storageManager: StorageManager;

  constructor(socketManager: ClientSocketManager, gameState: GameState) {
    this.socketManager = socketManager;
    this.gameState = gameState;
    this.storageManager = new StorageManager();
  }

  public setAdminPassword(password: string) {
    this.storageManager.setItem(ADMIN_PASSWORD_KEY, password);
  }

  public getAdminPassword(): string | null {
    return this.storageManager.getItem(ADMIN_PASSWORD_KEY);
  }

  private getCommandWithPassword<T extends AdminCommand>(command: Omit<T, "password">): T {
    const password = this.getAdminPassword();
    if (!password) {
      throw new Error("Admin password not set. Use setAdminPassword() first.");
    }
    return { ...command, password } as T;
  }

  public createItem(itemType: ItemType) {
    const player = getEntityById(this.gameState, this.gameState.playerId);
    if (!player) return;

    const positionable = player.getExt(ClientPositionable);

    this.socketManager.sendAdminCommand(
      this.getCommandWithPassword({
        command: ADMIN_COMMANDS.CREATE_ITEM,
        payload: { itemType, position: positionable.getCenterPosition() },
      })
    );
  }

  public createEntity(entityType: EntityType) {
    const player = getEntityById(this.gameState, this.gameState.playerId);
    if (!player) return;

    const positionable = player.getExt(ClientPositionable);
    this.socketManager.sendAdminCommand(
      this.getCommandWithPassword({
        command: ADMIN_COMMANDS.CREATE_ENTITY,
        payload: { entityType, position: positionable.getCenterPosition() },
      })
    );
  }

  public changeSkin(skinType: SkinType) {
    this.socketManager.sendAdminCommand(
      this.getCommandWithPassword<ChangeSkinCommand>({
        command: ADMIN_COMMANDS.CHANGE_SKIN,
        payload: {
          skinType,
          playerId: this.gameState.playerId,
        },
      })
    );
  }
}
