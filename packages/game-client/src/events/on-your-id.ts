import { YourIdEvent } from "../../../game-shared/src/events/server-sent/events/your-id-event";
import { InitializationContext } from "./types";

export const onYourId = (context: InitializationContext, yourIdEvent: YourIdEvent) => {
  context.gameState.playerId = yourIdEvent.getPlayerId();
  context.gameState.gameMode = yourIdEvent.getGameMode();
  context.setHasReceivedPlayerId(true);
  context.flushPendingFullStateAfterYourId();
  // If no full state was queued before YOUR_ID, request one (live flag — not the snapshot on context)
  if (!context.hasReceivedInitialStateLive()) {
    context.requestFullState("your id received");
  }
  context.checkInitialization();
};
