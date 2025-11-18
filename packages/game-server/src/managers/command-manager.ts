import {
  ADMIN_COMMANDS,
  AdminCommand,
  AdminCommandType,
  CreateEntityCommand,
  CreateItemCommand,
  ChangeSkinCommand,
} from "@shared/commands/commands";
import { IEntityManager } from "@/managers/types";
import Positionable from "@/extensions/positionable";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { Player } from "@/entities/players/player";
import { ADMIN_PASSWORD } from "@/config/env";

export class CommandManager {
  private entityManager: IEntityManager;
  private commandMap: Record<AdminCommandType, (payload: AdminCommand["payload"]) => void>;
  private adminPassword: string;

  constructor(entityManager: IEntityManager) {
    this.entityManager = entityManager;
    this.adminPassword = ADMIN_PASSWORD;
    this.commandMap = {
      [ADMIN_COMMANDS.CREATE_ITEM]: this.createItem.bind(this),
      [ADMIN_COMMANDS.CREATE_ENTITY]: this.createEntity.bind(this),
      [ADMIN_COMMANDS.CHANGE_SKIN]: this.changeSkin.bind(this),
    };
  }

  handleCommand(command: AdminCommand) {
    const handler = this.commandMap[command.command];
    if (!handler) return;

    if (command.password !== this.adminPassword) {
      console.warn("Invalid admin password provided");
      return;
    }

    handler(command.payload);
  }

  private createItem(payload: CreateItemCommand["payload"]) {
    const item = this.entityManager.createEntityFromItem({
      itemType: payload.itemType,
    });
    if (!item) return;
    const poolManager = PoolManager.getInstance();
    item
      .getExt(Positionable)
      .setPosition(poolManager.vector2.claim(payload.position.x + 32, payload.position.y));
    this.entityManager.addEntity(item);
  }

  private createEntity(payload: CreateEntityCommand["payload"]) {
    const entity = this.entityManager.createEntity(payload.entityType);
    if (!entity) return;
    entity
      .getExt(Positionable)
      .setPosition(
        PoolManager.getInstance().vector2.claim(payload.position.x + 32, payload.position.y)
      );
    this.entityManager.addEntity(entity);
  }

  private changeSkin(payload: ChangeSkinCommand["payload"]) {
    const player = this.entityManager.getEntityById(payload.playerId);
    if (player instanceof Player) {
      player.setSkin(payload.skinType);
    }
  }
}
