import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { RecipeType } from "@shared/util/recipes";
import { SocketEventHandler } from "./types";

export function onCraftRequest(context: HandlerContext, socket: ISocketAdapter, recipe: RecipeType): void {
  const player = context.players.get(socket.id);

  if (player) {
    player.craftRecipe(recipe);
  }
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

export const startCraftingHandler: SocketEventHandler<RecipeType> = {
  event: "START_CRAFTING",
  handler: (context, socket) => setPlayerCrafting(context, socket, true),
};

export const stopCraftingHandler: SocketEventHandler<RecipeType> = {
  event: "STOP_CRAFTING",
  handler: (context, socket) => setPlayerCrafting(context, socket, false),
};

