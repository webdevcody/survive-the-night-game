import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "./handler-context";
import { RecipeType } from "../../../../game-shared/src/util/recipes";

export function onCraftRequest(context: HandlerContext, socket: ISocketAdapter, recipe: RecipeType): void {
  const player = context.players.get(socket.id);

  if (player) {
    player.craftRecipe(recipe);
  }
}

