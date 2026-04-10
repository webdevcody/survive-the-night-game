import Positionable from "@/extensions/positionable";
import { BaseCommand } from "./base-command";
import PoolManager from "@shared/util/pool-manager";
import { SPAWNABLE_ENTITY_TYPES } from "@/constants";
export class SpawnCommand extends BaseCommand {
    constructor() {
        super(...arguments);
        this.name = "spawn";
        this.description = "Spawns an entity near the player";
        this.usage = "/spawn <entity_name>";
    }
    execute(context) {
        const { args, player, entityManager } = context;
        if (args.length === 0) {
            return "Usage: /spawn <entity_name>. Type /list to see available entities.";
        }
        const entityName = args[0].toLowerCase();
        if (!SPAWNABLE_ENTITY_TYPES.includes(entityName)) {
            return `Unknown entity: ${entityName}. Type /list to see available entities.`;
        }
        const playerPosition = player.getExt(Positionable).getPosition();
        const spawnedEntity = entityManager.createEntity(entityName);
        if (spawnedEntity) {
            spawnedEntity
                .getExt(Positionable)
                .setPosition(PoolManager.getInstance().vector2.claim(playerPosition.x + 32, playerPosition.y));
            entityManager.addEntity(spawnedEntity);
        }
    }
}
