import { PlayerDeathEvent } from "@shared/events/server-sent/player-death-event";
import { PlayerClient } from "@/entities/player";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { ClientEventContext } from "./types";

export const onPlayerDeath = (context: ClientEventContext, event: PlayerDeathEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  context.gameClient.getHud().showPlayerDeath(event.getDisplayName());

  const player = context.gameClient.getEntityById(event.getPlayerId());
  if (!player || !(player instanceof PlayerClient)) return;

  const playerPosition = player.getCenterPosition();
  context.gameClient
    .getSoundManager()
    .playPositionalSound(SOUND_TYPES_TO_MP3.PLAYER_DEATH, playerPosition);
};

