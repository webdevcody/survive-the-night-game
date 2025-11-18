import { PlayerLeftEvent } from "@shared/events/server-sent/player-left-event";
import { ClientEventContext } from "./types";

export const onPlayerLeft = (context: ClientEventContext, event: PlayerLeftEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  const playerId = event.getPlayerId();
  const player = context.gameClient.getEntityById(playerId);
  if (!player) return;
  context.gameClient.getHud().addMessage(`${event.getDisplayName()} left the game`);
  context.gameClient.removeEntity(event.getPlayerId());
};

