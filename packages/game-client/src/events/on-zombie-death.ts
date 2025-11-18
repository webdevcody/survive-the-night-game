import { ZombieDeathEvent } from "@shared/events/server-sent/zombie-death-event";
import { ZombieClient } from "@/entities/zombie";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { distance } from "@shared/util/physics";
import { ClientEventContext } from "./types";

const ZOMBIE_SHAKE_MAX_DISTANCE = 480;
const ZOMBIE_SHAKE_DURATION_MS = 160;
const ZOMBIE_SHAKE_MAX_INTENSITY = 4;

export const onZombieDeath = (context: ClientEventContext, event: ZombieDeathEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  const zombie = context.gameClient.getEntityById(event.getZombieId());
  if (!zombie) return;

  const zombiePosition = (zombie as unknown as ZombieClient).getCenterPosition();

  context.gameClient
    .getSoundManager()
    .playPositionalSound(SOUND_TYPES_TO_MP3.ZOMBIE_DEATH, zombiePosition);

  const localPlayer = context.gameClient.getMyPlayer();
  if (localPlayer) {
    const playerPosition = localPlayer.getCenterPosition();
    const distToPlayer = distance(playerPosition, zombiePosition);
    if (distToPlayer <= ZOMBIE_SHAKE_MAX_DISTANCE) {
      const proximity = 1 - distToPlayer / ZOMBIE_SHAKE_MAX_DISTANCE;
      const intensity = ZOMBIE_SHAKE_MAX_INTENSITY * proximity;
      if (intensity > 0) {
        context.gameClient.shakeCamera(intensity, ZOMBIE_SHAKE_DURATION_MS);
      }
    }
  }
};

