import { ZombieAlertedEvent } from "../../../game-shared/src/events/server-sent/events/zombie-alerted-event";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import PoolManager from "@shared/util/pool-manager";
import { ClientEventContext } from "./types";

export const onZombieAlerted = (context: ClientEventContext, event: ZombieAlertedEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  
  const zombiePosition = event.getPosition();
  const poolManager = PoolManager.getInstance();
  const position = poolManager.vector2.claim(zombiePosition.x, zombiePosition.y);
  
  context.gameClient
    .getSoundManager()
    .playPositionalSound(SOUND_TYPES_TO_MP3.ZOMBIE_GROWL, position);
  
  // Release pooled vector
  poolManager.vector2.release(position);
};

