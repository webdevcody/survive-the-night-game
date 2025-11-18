import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { RecipeType } from "@shared/util/recipes";

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

