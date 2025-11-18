import { CraftEvent } from "@shared/events/server-sent/craft-event";
import { ClientPositionable } from "@/extensions";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { ClientEventContext } from "./types";

export const onCraft = (context: ClientEventContext, event: CraftEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  const player = context.gameClient.getEntityById(event.getPlayerId());
  if (!player || !player.hasExt(ClientPositionable)) return;

  const playerPosition = player.getExt(ClientPositionable).getCenterPosition();
  context.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES_TO_MP3.CRAFT, playerPosition);
};

