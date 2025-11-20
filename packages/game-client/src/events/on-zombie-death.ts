import { ZombieDeathEvent } from "../../../game-shared/src/events/server-sent/events/zombie-death-event";
import { ZombieClient } from "@/entities/zombie";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { ClientEventContext } from "./types";

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

  const localPlayerId = context.gameClient.getGameState().playerId;
  if (localPlayerId && event.getKillerId() === localPlayerId) {
    context.gameClient.shakeCamera(ZOMBIE_SHAKE_MAX_INTENSITY, ZOMBIE_SHAKE_DURATION_MS);
  }
};
