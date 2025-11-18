import { CoinPickupEvent } from "../../../game-shared/src/events/server-sent/events/coin-pickup-event";
import { ClientPositionable } from "@/extensions";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { ClientEventContext } from "./types";

export const onCoinPickup = (context: ClientEventContext, event: CoinPickupEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  const coin = context.gameClient.getEntityById(event.getEntityId());
  if (!coin) return;

  const coinPosition = coin.getExt(ClientPositionable).getCenterPosition();
  context.gameClient
    .getSoundManager()
    .playPositionalSound(SOUND_TYPES_TO_MP3.COIN_PICKUP, coinPosition);
};
