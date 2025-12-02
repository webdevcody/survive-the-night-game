import { LightningBoltEvent } from "../../../game-shared/src/events/server-sent/events/lightning-bolt-event";
import { ClientEventContext } from "./types";

// Store lightning flash state for animation
let lightningFlashState: {
  startTime: number;
  duration: number;
  baseMultiplier: number;
  flashMultiplier: number;
} | null = null;

export const onLightningBolt = (context: ClientEventContext, event: LightningBoltEvent) => {
  const gameState = context.gameState;

  // Trigger lightning flash animation
  // Base multiplier is 0.5 during thunderstorm, 1.0 otherwise
  const baseMultiplier = gameState.globalIlluminationMultiplier;
  const flashMultiplier = 2.0 + Math.random(); // Random between 2.0 and 3.0

  // Store flash state for animation in update loop
  lightningFlashState = {
    startTime: Date.now(),
    duration: 100 + Math.random() * 100, // 200-300ms
    baseMultiplier: baseMultiplier,
    flashMultiplier: flashMultiplier,
  };

  // Immediately set to flash multiplier
  gameState.globalIlluminationMultiplier = flashMultiplier;

  // Trigger visual lightning bolt effect if a player was struck
  const playerId = event.getPlayerId();
  if (playerId !== undefined) {
    context.gameClient.lightningBoltManager.triggerBolt(playerId);
  }
};

/**
 * Update lightning flash animation (called from game loop)
 */
export const updateLightningFlash = (gameState: { globalIlluminationMultiplier: number }): void => {
  if (!lightningFlashState) return;

  const elapsed = Date.now() - lightningFlashState.startTime;
  const progress = Math.min(elapsed / lightningFlashState.duration, 1.0);

  if (progress >= 1.0) {
    // Animation complete, reset to base multiplier
    gameState.globalIlluminationMultiplier = lightningFlashState.baseMultiplier;
    lightningFlashState = null;
    return;
  }

  // Quadratic ease-out: start fast, end slow
  const easedProgress = 1 - Math.pow(1 - progress, 2);

  // Interpolate from flash multiplier back to base multiplier
  gameState.globalIlluminationMultiplier =
    lightningFlashState.flashMultiplier +
    (lightningFlashState.baseMultiplier - lightningFlashState.flashMultiplier) * easedProgress;
};
