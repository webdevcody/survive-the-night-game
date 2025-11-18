import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import { ZombieClient } from "@/entities/zombie";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { SwipeParticle } from "@/particles/swipe";
import { determineDirection, Direction } from "@shared/util/direction";
import { ClientEventContext } from "./types";

export const onZombieAttacked = (context: ClientEventContext, event: ZombieAttackedEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  const zombie = context.gameClient.getEntityById(event.getZombieId());
  if (!zombie) return;

  const zombieClient = zombie as unknown as ZombieClient;
  const zombiePosition = zombieClient.getCenterPosition().clone();

  // Play attack sounds
  context.gameClient
    .getSoundManager()
    .playPositionalSound(SOUND_TYPES_TO_MP3.ZOMBIE_ATTACKED, zombiePosition);
  context.gameClient
    .getSoundManager()
    .playPositionalSound(SOUND_TYPES_TO_MP3.ZOMBIE_HURT, zombiePosition);

  // Add swing animation
  const velocity = zombieClient.getVelocity();
  const facing = determineDirection(velocity) || Direction.Right;
  const particle = new SwipeParticle(context.gameClient.getImageLoader(), facing, "zombie");
  particle.setPosition(zombiePosition);
  context.gameClient.getParticleManager().addParticle(particle);
};

