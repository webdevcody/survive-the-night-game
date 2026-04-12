import { PlayerLevelUpEvent } from "../../../game-shared/src/events/server-sent/events/player-level-up-event";
import { ClientPositionable } from "@/extensions";
import { ConfettiBurstParticle } from "@/particles/confetti-burst";
import Vector2 from "@shared/util/vector2";
import { ClientEventContext } from "./types";

export const onPlayerLevelUp = (context: ClientEventContext, event: PlayerLevelUpEvent) => {
  if (!context.shouldProcessEntityEvent()) {
    return;
  }

  const player = context.gameClient.getEntityById(event.getPlayerId());
  if (!player || !player.hasExt(ClientPositionable)) {
    return;
  }

  const positionable = player.getExt(ClientPositionable);
  const position = positionable.getPosition();
  const size = positionable.getSize();
  const confettiOrigin = new Vector2(position.x + size.x / 2, position.y - 4);

  const particle = new ConfettiBurstParticle(context.gameClient.getImageLoader());
  particle.setPosition(confettiOrigin);
  particle.onInitialized();
  context.gameClient.getParticleManager().addParticle(particle);
};
