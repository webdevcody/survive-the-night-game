import { Entity } from "@/entities/entity";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import { Entities } from "@shared/constants";
import PoolManager from "@shared/util/pool-manager";
import { getConfig } from "@shared/config";
import { SerializableFields } from "@/util/serializable-fields";
import { dialogueNpcSessionsToSerialized, getDialogueNpcSessions, } from "@shared/map/world-map-types";
/**
 * Static NPC using the survivor sprite; dialogue is authored in world-map.json.
 */
export class DialogueSurvivorNpc extends Entity {
    constructor(gameManagers, entry, tileX, tileY) {
        var _a, _b;
        super(gameManagers, Entities.DIALOGUE_SURVIVOR_NPC);
        const dialogueSessions = dialogueNpcSessionsToSerialized(getDialogueNpcSessions(entry));
        this.serialized = new SerializableFields({
            dialogueSessions,
            displayName: (_b = (_a = entry.name) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : "",
            npcKey: `${tileY},${tileX}`,
        }, () => this.markEntityDirty(), {});
        const poolManager = PoolManager.getInstance();
        const TILE_SIZE = getConfig().world.TILE_SIZE;
        const size = poolManager.vector2.claim(16, 16);
        const topLeft = poolManager.vector2.claim(tileX * TILE_SIZE, tileY * TILE_SIZE);
        this.addExtension(new Positionable(this).setSize(size).setPosition(topLeft));
        this.addExtension(new Interactive(this).onInteract(() => { }).setDisplayName("talk"));
    }
}
