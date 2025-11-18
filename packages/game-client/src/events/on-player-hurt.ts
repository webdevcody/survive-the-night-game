import { PlayerHurtEvent } from "../../../game-shared/src/events/server-sent/events/player-hurt-event";
import { PlayerClient } from "@/entities/player";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { ClientEventContext } from "./types";

export const onPlayerHurt = (context: ClientEventContext, event: PlayerHurtEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  const player = context.gameClient.getEntityById(event.getPlayerId());
  if (!player || !(player instanceof PlayerClient)) return;

  const playerPosition = player.getCenterPosition();
  context.gameClient
    .getSoundManager()
    .playPositionalSound(SOUND_TYPES_TO_MP3.PLAYER_HURT, playerPosition);

  // Interrupt teleport if local player takes damage
  const hurtPlayerId = event.getPlayerId();
  const localPlayerId = context.gameClient.getGameState().playerId;

  // Compare IDs directly - if the hurt player is the local player, interrupt teleport
  if (localPlayerId && hurtPlayerId === localPlayerId) {
    context.gameClient.interruptTeleport();
  }
};
