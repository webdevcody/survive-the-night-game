import { LootEvent } from "../../../game-shared/src/events/server-sent/events/loot-event";
import { ClientPositionable } from "@/extensions";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { ClientEventContext } from "./types";

export const onLoot = (context: ClientEventContext, event: LootEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  const loot = context.gameClient.getEntityById(event.getEntityId());
  if (!loot) return;

  const positionable = loot.getExt(ClientPositionable);
  if (!positionable) return;

  const lootPosition = positionable.getCenterPosition();
  context.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES_TO_MP3.LOOT, lootPosition);
};
