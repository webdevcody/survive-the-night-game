import { YourIdEvent } from "../../../game-shared/src/events/server-sent/events/your-id-event";
import { InitializationContext } from "./types";

export const onYourId = (context: InitializationContext, yourIdEvent: YourIdEvent) => {
  console.log("Received your ID", yourIdEvent.getPlayerId(), "game mode:", yourIdEvent.getGameMode());
  context.gameState.playerId = yourIdEvent.getPlayerId();
  context.gameState.gameMode = yourIdEvent.getGameMode();
  context.setHasReceivedPlayerId(true);
  context.checkInitialization();
};
