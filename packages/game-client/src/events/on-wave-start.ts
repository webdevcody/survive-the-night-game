import { WaveStartEvent } from "../../../game-shared/src/events/server-sent/events/wave-start-event";
import { ClientPositionable } from "@/extensions";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import PoolManager from "@shared/util/pool-manager";
import { ClientEventContext } from "./types";

const WAVE_START_SHAKE_INTENSITY = 4.5;
const WAVE_START_SHAKE_DURATION_MS = 420;

export const onWaveStart = (context: ClientEventContext, event: WaveStartEvent) => {
  // Play horn sound at player's position (or center if player doesn't exist)
  const myPlayer = context.gameClient.getMyPlayer();
  if (myPlayer && myPlayer.hasExt(ClientPositionable)) {
    const playerPosition = myPlayer.getExt(ClientPositionable).getCenterPosition();
    context.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.HORN, playerPosition);
  } else {
    // Fallback: play at origin if player doesn't exist yet
    const poolManager = PoolManager.getInstance();
    const fallbackPosition = poolManager.vector2.claim(0, 0);
    context.gameClient
      .getSoundManager()
      .playPositionalSound(SOUND_TYPES_TO_MP3.HORN, fallbackPosition);
  }

  // Kick off the round with a noticeable screen shake so players feel the threat ramping up
  context.gameClient.shakeCamera(WAVE_START_SHAKE_INTENSITY, WAVE_START_SHAKE_DURATION_MS);

  // Start battle music (plays on top of background music)
  context.gameClient.getSoundManager().playBattleMusic();
};
