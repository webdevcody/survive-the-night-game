/**
 * Registers all custom entity classes in the override registry
 * This allows the system to use custom classes when they exist,
 * and fall back to generic entities for simple items
 *
 * Uses ENTITY_REGISTRATION_CONFIG to maintain consistent registration order
 * between server and client
 */
export declare function registerCustomEntities(): void;
