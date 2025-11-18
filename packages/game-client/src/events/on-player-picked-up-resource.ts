import { PlayerPickedUpResourceEvent } from "../../../game-shared/src/events/server-sent/events/pickup-resource-event";
import { PlayerClient } from "@/entities/player";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { ClientEventContext } from "./types";

export const onPlayerPickedUpResource = (
  context: ClientEventContext,
  event: PlayerPickedUpResourceEvent
) => {
  if (!context.shouldProcessEntityEvent()) return;
  const player = context.gameClient.getEntityById(event.getPlayerId());
  if (!player || !(player instanceof PlayerClient)) return;

  const playerPosition = player.getCenterPosition();
  context.gameClient
    .getSoundManager()
    .playPositionalSound(SOUND_TYPES_TO_MP3.PICK_UP_ITEM, playerPosition);
};
