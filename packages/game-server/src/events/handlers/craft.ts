import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { getCraftableItemIds } from "@shared/util/recipes";
import type { CraftRequestEventData } from "@shared/events/client-sent/events/craft-request";
import { SocketEventHandler } from "./types";

// Cache valid recipe types for validation - built dynamically from config-based recipes
const VALID_RECIPE_TYPES = new Set(getCraftableItemIds());

/**
 * Validate recipe type
 */
function validateCraftRequest(data: unknown): CraftRequestEventData | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const raw = data as Record<string, unknown>;
  if (typeof raw.recipeId !== "string") {
    return null;
  }
  if (!raw.recipeId.startsWith("scrap:") && !VALID_RECIPE_TYPES.has(raw.recipeId)) {
    return null;
  }
  if (
    typeof raw.stationEntityId !== "number" ||
    !Number.isFinite(raw.stationEntityId) ||
    !Number.isInteger(raw.stationEntityId) ||
    raw.stationEntityId < 0
  ) {
    return null;
  }
  return {
    recipeId: raw.recipeId,
    stationEntityId: raw.stationEntityId,
  };
}

export function onCraftRequest(
  context: HandlerContext,
  socket: ISocketAdapter,
  recipe: unknown,
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  // Zombie players cannot craft
  if (player.isZombie()) return;

  const validatedRecipe = validateCraftRequest(recipe);
  if (!validatedRecipe) {
    console.warn(`Invalid craft request from socket ${socket.id}: ${JSON.stringify(recipe)}`);
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

  // Zombie players cannot craft
  if (player.isZombie()) return;

  player.setIsCrafting(isCrafting);
}

export const craftRequestHandler: SocketEventHandler<CraftRequestEventData> = {
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
