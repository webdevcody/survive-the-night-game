import { YourIdEvent } from "@shared/events/server-sent/your-id-event";
import { InitializationContext } from "./types";

export const onYourId = (context: InitializationContext, yourIdEvent: YourIdEvent) => {
  context.gameState.playerId = yourIdEvent.getPlayerId();
  context.setHasReceivedPlayerId(true);
  context.processPendingFullStateIfReady();
  context.checkInitialization();
};

