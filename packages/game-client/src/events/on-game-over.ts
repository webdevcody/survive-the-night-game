import { GameOverEvent } from "@shared/events/server-sent/game-over-event";
import { ClientEventContext } from "./types";

export const onGameOver = (context: ClientEventContext, event: GameOverEvent) => {
  context.gameClient.getGameOverDialog().show();
};

