import { GameMessageEvent } from "../../../game-shared/src/events/server-sent/events/game-message-event";
import { ClientEventContext } from "./types";

export const onThunderstormEnd = (context: ClientEventContext, event: GameMessageEvent) => {
  const gameState = context.gameState;

  // Reset global illumination multiplier to 1.0
  gameState.globalIlluminationMultiplier = 1.0;

  // Reset darkness hue to red
  gameState.darknessHue = "red";

  // Disable rain particles
  const rainManager = (context.gameClient as any).rainParticleManager;
  if (rainManager) {
    rainManager.setActive(false);
  }

  // Show message
  context.gameClient.getHud().addMessage(event.getMessage(), event.getColor());
};
