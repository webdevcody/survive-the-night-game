import { BuildEvent } from "@shared/events/server-sent/build-event";
import { SOUND_TYPES_TO_MP3, SoundType } from "@/managers/sound-manager";
import PoolManager from "@shared/util/pool-manager";
import { ClientEventContext } from "./types";

export const onBuild = (context: ClientEventContext, event: BuildEvent) => {
  const buildPosition = event.getPosition();
  const poolManager = PoolManager.getInstance();
  const position = poolManager.vector2.claim(buildPosition.x, buildPosition.y);
  const soundType = event.getSoundType() as SoundType;

  // Only play sound if it's a valid sound type
  if (soundType && Object.values(SOUND_TYPES_TO_MP3).includes(soundType as any)) {
    context.gameClient.getSoundManager().playPositionalSound(soundType, position);
  }
};

