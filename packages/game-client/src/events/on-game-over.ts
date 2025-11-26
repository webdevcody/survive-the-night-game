import { GameOverEvent } from "../../../game-shared/src/events/server-sent/events/game-over-event";
import { ClientEventContext } from "./types";

export const onGameOver = (context: ClientEventContext, event: GameOverEvent) => {
  const data = event.getData();
  context.gameClient.getGameOverDialog().show({
    message: data.message,
    winnerName: data.winnerName,
    winnerId: data.winnerId,
  });
};
