/**
 * Registry for custom entity class overrides
 * When an entity type has a custom class registered here, it will be used instead of the generic one
 */
class EntityOverrideRegistry {
    constructor() {
        this.overrides = new Map();
    }
    /**
     * Register a custom entity class for a specific entity type
     */
    register(entityType, constructor) {
        this.overrides.set(entityType, constructor);
    }
    /**
     * Get the custom entity class for a specific entity type, or undefined if none exists
     */
    get(entityType) {
        return this.overrides.get(entityType);
    }
    /**
     * Check if a custom entity class exists for a specific entity type
     */
    has(entityType) {
        return this.overrides.has(entityType);
    }
    /**
     * Get all registered entity types
     */
    getAllEntityTypes() {
        return Array.from(this.overrides.keys());
    }
}
export const entityOverrideRegistry = new EntityOverrideRegistry();
