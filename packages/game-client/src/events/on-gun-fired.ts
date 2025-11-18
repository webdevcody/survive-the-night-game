import { GunFiredEvent } from "../../../game-shared/src/events/server-sent/events/gun-fired-event";
import { PlayerClient } from "@/entities/player";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { ClientEventContext } from "./types";

export const onGunFired = (context: ClientEventContext, event: GunFiredEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  const player = context.gameClient.getEntityById(event.getEntityId());
  if (!player || !(player instanceof PlayerClient)) return;

  const playerPosition = player.getCenterPosition();
  context.gameClient
    .getSoundManager()
    .playPositionalSound(SOUND_TYPES_TO_MP3.PISTOL, playerPosition);
};
