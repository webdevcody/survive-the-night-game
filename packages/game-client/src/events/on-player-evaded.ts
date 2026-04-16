import { PlayerEvadedEvent } from "../../../game-shared/src/events/server-sent/events/player-evaded-event";
import { PlayerClient } from "@/entities/player";
import { MissTextParticle } from "@/particles/miss-text";
import { ClientEventContext } from "./types";
import PoolManager from "@shared/util/pool-manager";

export const onPlayerEvaded = (context: ClientEventContext, event: PlayerEvadedEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  const player = context.gameClient.getEntityById(event.getPlayerId());
  if (!player || !(player instanceof PlayerClient)) return;

  const center = player.getCenterPosition();
  const pm = PoolManager.getInstance();
  const spawn = pm.vector2.claim(center.x, center.y);
  context.gameClient
    .getParticleManager()
    .addParticle(new MissTextParticle(context.gameClient.getImageLoader(), spawn));
  pm.vector2.release(spawn);
};
