import { getCraftableItemIds } from "@shared/util/recipes";
// Cache valid recipe types for validation - built dynamically from config-based recipes
const VALID_RECIPE_TYPES = new Set(getCraftableItemIds());
/**
 * Validate recipe type
 */
function validateCraftRequest(data) {
    if (!data || typeof data !== "object") {
        return null;
    }
    const raw = data;
    if (typeof raw.recipeId !== "string") {
        return null;
    }
    if (!raw.recipeId.startsWith("scrap:") && !VALID_RECIPE_TYPES.has(raw.recipeId)) {
        return null;
    }
    if (typeof raw.stationEntityId !== "number" ||
        !Number.isFinite(raw.stationEntityId) ||
        !Number.isInteger(raw.stationEntityId) ||
        raw.stationEntityId < 0) {
        return null;
    }
    return {
        recipeId: raw.recipeId,
        stationEntityId: raw.stationEntityId,
    };
}
export function onCraftRequest(context, socket, recipe) {
    const player = context.players.get(socket.id);
    if (!player)
        return;
    // Zombie players cannot craft
    if (player.isZombie())
        return;
    const validatedRecipe = validateCraftRequest(recipe);
    if (!validatedRecipe) {
        console.warn(`Invalid craft request from socket ${socket.id}: ${JSON.stringify(recipe)}`);
        return;
    }
    player.craftRecipe(validatedRecipe);
}
export function setPlayerCrafting(context, socket, isCrafting) {
    const player = context.players.get(socket.id);
    if (!player)
        return;
    // Zombie players cannot craft
    if (player.isZombie())
        return;
    player.setIsCrafting(isCrafting);
}
export const craftRequestHandler = {
    event: "CRAFT_REQUEST",
    handler: onCraftRequest,
};
export const startCraftingHandler = {
    event: "START_CRAFTING",
    handler: (context, socket) => setPlayerCrafting(context, socket, true),
};
export const stopCraftingHandler = {
    event: "STOP_CRAFTING",
    handler: (context, socket) => setPlayerCrafting(context, socket, false),
};
