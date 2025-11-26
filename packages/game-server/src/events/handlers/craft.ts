import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { RecipeType } from "@shared/util/recipes";
import { SocketEventHandler } from "./types";

// Cache valid recipe types for validation
const VALID_RECIPE_TYPES = new Set(Object.values(RecipeType));

/**
 * Validate recipe type
 */
function validateRecipeType(recipe: unknown): RecipeType | null {
  if (typeof recipe !== "string") {
    return null;
  }

  if (!VALID_RECIPE_TYPES.has(recipe as RecipeType)) {
    return null;
  }

  return recipe as RecipeType;
}

export function onCraftRequest(
  context: HandlerContext,
  socket: ISocketAdapter,
  recipe: unknown
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  const validatedRecipe = validateRecipeType(recipe);
  if (!validatedRecipe) {
    console.warn(`Invalid craft request from socket ${socket.id}: ${recipe}`);
    return;
  }

  player.craftRecipe(validatedRecipe);
}

export function setPlayerCrafting(
  context: HandlerContext,
  socket: ISocketAdapter,
  isCrafting: boolean
): void {
  const player = context.players.get(socket.id);
  if (!player) return;
  player.setIsCrafting(isCrafting);
}

export const craftRequestHandler: SocketEventHandler<RecipeType> = {
  event: "CRAFT_REQUEST",
  handler: onCraftRequest,
};

export const startCraftingHandler: SocketEventHandler<void> = {
  event: "START_CRAFTING",
  handler: (context, socket) => setPlayerCrafting(context, socket, true),
};

export const stopCraftingHandler: SocketEventHandler<void> = {
  event: "STOP_CRAFTING",
  handler: (context, socket) => setPlayerCrafting(context, socket, false),
};

