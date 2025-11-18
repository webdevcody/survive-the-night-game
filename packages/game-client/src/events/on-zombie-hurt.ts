import { ZombieHurtEvent } from "@shared/events/server-sent/zombie-hurt-event";
import { ZombieClient } from "@/entities/zombie";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { ClientEventContext } from "./types";

export const onZombieHurt = (context: ClientEventContext, event: ZombieHurtEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  const zombie = context.gameClient.getEntityById(event.getZombieId());
  if (!zombie) return;

  const zombiePosition = (zombie as unknown as ZombieClient).getCenterPosition();
  context.gameClient
    .getSoundManager()
    .playPositionalSound(SOUND_TYPES_TO_MP3.ZOMBIE_HURT, zombiePosition);
};

