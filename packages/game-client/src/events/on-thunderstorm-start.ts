import { GameMessageEvent } from "../../../game-shared/src/events/server-sent/events/game-message-event";
import { ServerSentEvents } from "@shared/events/events";
import { ClientEventContext } from "./types";

export const onThunderstormStart = (context: ClientEventContext, event: GameMessageEvent) => {
  const gameState = context.gameState;

  // Set global illumination multiplier to 0.7 (reduce by 30% - less aggressive than 0.5)
  // This reduces illumination noticeably but still keeps things visible
  gameState.globalIlluminationMultiplier = 0.7;

  // Change darkness hue to blue
  gameState.darknessHue = "blue";

  // Enable rain particles
  const rainManager = context.gameClient.rainParticleManager;
  if (rainManager) {
    rainManager.setActive(true);
  }

  // Show message
  context.gameClient.getHud().addMessage(event.getMessage(), event.getColor());
};
