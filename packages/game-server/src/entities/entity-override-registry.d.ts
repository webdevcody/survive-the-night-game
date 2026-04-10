import { EntityType } from "@/types/entity";
import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
type EntityConstructor = new (gameManagers: IGameManagers, ...args: any[]) => Entity;
/**
 * Registry for custom entity class overrides
 * When an entity type has a custom class registered here, it will be used instead of the generic one
 */
declare class EntityOverrideRegistry {
    private overrides;
    /**
     * Register a custom entity class for a specific entity type
     */
    register(entityType: EntityType, constructor: EntityConstructor): void;
    /**
     * Get the custom entity class for a specific entity type, or undefined if none exists
     */
    get(entityType: EntityType): EntityConstructor | undefined;
    /**
     * Check if a custom entity class exists for a specific entity type
     */
    has(entityType: EntityType): boolean;
    /**
     * Get all registered entity types
     */
    getAllEntityTypes(): EntityType[];
}
export declare const entityOverrideRegistry: EntityOverrideRegistry;
export {};
