import { GameOverEvent } from "../../../game-shared/src/events/server-sent/events/game-over-event";
import { ClientEventContext } from "./types";

export const onGameOver = (context: ClientEventContext, event: GameOverEvent) => {
  context.gameClient.getGameOverDialog().show();
};
