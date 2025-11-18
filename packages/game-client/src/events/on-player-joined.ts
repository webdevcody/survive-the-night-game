import { PlayerJoinedEvent } from "@shared/events/server-sent/player-joined-event";
import { ClientEventContext } from "./types";

export const onPlayerJoined = (context: ClientEventContext, event: PlayerJoinedEvent) => {
  context.gameClient.getHud().showPlayerJoined(event.getDisplayName());
};

