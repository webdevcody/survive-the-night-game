import { ENABLE_PERFORMANCE_MONITORING } from "@/config/config";
export class EntityStateTracker {
    constructor() {
        this.removedEntityIds = new Set();
        this.dirtyEntities = new Set();
        this.dirtyEntityInfo = new Map();
        this.previousGameState = {};
    }
    trackRemoval(entityId) {
        this.removedEntityIds.add(entityId);
    }
    trackDirtyEntity(entity) {
        this.dirtyEntities.add(entity);
        // Track detailed information about why entity is dirty (only if performance monitoring enabled)
        if (ENABLE_PERFORMANCE_MONITORING) {
            const dirtyExtensions = entity.getDirtyExtensions().map((ext) => {
                const type = ext.constructor.type || "unknown";
                return type;
            });
            // Get dirty fields if entity has them (check if entity has dirtyFields method/property)
            const dirtyFields = [];
            if ("dirtyFields" in entity && entity.dirtyFields instanceof Set) {
                dirtyFields.push(...Array.from(entity.dirtyFields));
            }
            const reason = dirtyExtensions.length > 0
                ? `extensions: ${dirtyExtensions.join(", ")}`
                : dirtyFields.length > 0
                    ? `fields: ${dirtyFields.join(", ")}`
                    : "unknown";
            this.dirtyEntityInfo.set(entity.getId(), {
                id: entity.getId(),
                type: entity.getType(),
                dirtyExtensions,
                dirtyFields,
                reason,
            });
        }
    }
    untrackDirtyEntity(entity) {
        this.dirtyEntities.delete(entity);
        this.dirtyEntityInfo.delete(entity.getId());
    }
    getChangedEntities() {
        // Return entities from the tracked Set instead of looping through all entities
        return Array.from(this.dirtyEntities);
    }
    getDirtyEntityInfo() {
        return Array.from(this.dirtyEntityInfo.values());
    }
    clearDirtyEntityInfo() {
        this.dirtyEntityInfo.clear();
    }
    getRemovedEntityIds() {
        return Array.from(this.removedEntityIds);
    }
    clearRemovedEntityIds() {
        this.removedEntityIds.clear();
    }
    getPreviousEntityState(entityId) {
        // No longer tracking previous state - dirty flags handle change detection
        return null;
    }
    getPreviousExtensionTypes(entityId) {
        // No longer tracking extension types - entity's removedExtensions array handles this
        return [];
    }
    clear() {
        this.removedEntityIds.clear();
        this.dirtyEntities.clear();
        this.dirtyEntityInfo.clear();
        this.previousGameState = {};
    }
    trackGameState(gameState) {
        this.previousGameState = Object.assign({}, gameState);
    }
    getChangedGameStateProperties(currentGameState) {
        const changedProps = {};
        // Automatically track all properties from the current game state
        const gameStateProperties = Object.keys(currentGameState);
        for (const prop of gameStateProperties) {
            const currentValue = currentGameState[prop];
            const previousValue = this.previousGameState[prop];
            if (currentValue !== previousValue) {
                changedProps[prop] = currentValue;
            }
        }
        return changedProps;
    }
}
