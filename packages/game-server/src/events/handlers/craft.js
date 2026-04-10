import { getCraftableItemIds } from "@shared/util/recipes";
// Cache valid recipe types for validation - built dynamically from config-based recipes
const VALID_RECIPE_TYPES = new Set(getCraftableItemIds());
/**
 * Validate recipe type
 */
function validateRecipeType(recipe) {
    if (typeof recipe !== "string") {
        return null;
    }
    if (!VALID_RECIPE_TYPES.has(recipe)) {
        return null;
    }
    return recipe;
}
export function onCraftRequest(context, socket, recipe) {
    const player = context.players.get(socket.id);
    if (!player)
        return;
    // Zombie players cannot craft
    if (player.isZombie())
        return;
    const validatedRecipe = validateRecipeType(recipe);
    if (!validatedRecipe) {
        console.warn(`Invalid craft request from socket ${socket.id}: ${recipe}`);
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
