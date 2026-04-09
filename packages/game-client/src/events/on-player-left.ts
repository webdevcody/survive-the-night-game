import { PlayerLeftEvent } from "../../../game-shared/src/events/server-sent/events/player-left-event";
import { ClientEventContext } from "./types";

export const onPlayerLeft = (context: ClientEventContext, event: PlayerLeftEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  const playerId = event.getPlayerId();
  const player = context.gameClient.getEntityById(playerId);
  if (!player) return;

  // Remove from spatial grid before removing from state (same pattern as delta updates)
  context.gameClient.getRenderer().removeEntityFromSpatialGrid(player);
  context.gameClient.removeEntity(event.getPlayerId());
};
