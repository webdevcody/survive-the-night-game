/**
 * Persist a positive experience delta to the website DB (game server API key).
 * Fire-and-forget; same endpoint as zombie-kill XP.
 */
export declare function queuePersistExperienceDeltaToWebsite(userId: string, delta: number): void;
