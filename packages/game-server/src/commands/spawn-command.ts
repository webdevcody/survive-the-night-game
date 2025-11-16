import Positionable from "@/extensions/positionable";
import { BaseCommand, type CommandContext } from "./base-command";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { SPAWNABLE_ENTITY_TYPES } from "@/constants";

export class SpawnCommand extends BaseCommand {
  name = "spawn";
  description = "Spawns an entity near the player";
  usage = "/spawn <entity_name>";

  execute(context: CommandContext): string | void {
    const { args, player, entityManager } = context;

    if (args.length === 0) {
      return "Usage: /spawn <entity_name>. Type /list to see available entities.";
    }

    const entityName = args[0].toLowerCase();

    if (!SPAWNABLE_ENTITY_TYPES.includes(entityName as any)) {
      return `Unknown entity: ${entityName}. Type /list to see available entities.`;
    }

    const playerPosition = player.getExt(Positionable).getPosition();
    const spawnedEntity = entityManager.createEntity(entityName as any);

    if (spawnedEntity) {
      spawnedEntity
        .getExt(Positionable)
        .setPosition(PoolManager.getInstance().vector2.claim(playerPosition.x + 32, playerPosition.y));
      entityManager.addEntity(spawnedEntity);
      return `Spawned ${entityName} near you.`;
    }

    return `Failed to spawn ${entityName}.`;
  }
}
