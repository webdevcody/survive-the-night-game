import { PlayerJoinedEvent } from "../../../game-shared/src/events/server-sent/events/player-joined-event";
import { ClientEventContext } from "./types";

export const onPlayerJoined = (context: ClientEventContext, event: PlayerJoinedEvent) => {
  context.gameClient.getHud().showPlayerJoined(event.getDisplayName());
};
