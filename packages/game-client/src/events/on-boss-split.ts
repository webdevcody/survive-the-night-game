import { BossSplitEvent } from "../../../game-shared/src/events/server-sent/events/boss-split-event";
import { SummonParticle } from "@/particles/summon";
import Vector2 from "@shared/util/vector2";
import { ClientEventContext } from "./types";

export const onBossSplit = (context: ClientEventContext, event: BossSplitEvent) => {
  const positions = event.getPositions();
  
  // Create visual effects at each split position
  positions.forEach((pos) => {
    const particle = new SummonParticle(
      context.gameClient.getImageLoader(),
      context.gameClient.getSoundManager()
    );
    particle.setPosition(new Vector2(pos.x, pos.y));
    particle.onInitialized();
    context.gameClient.getParticleManager().addParticle(particle);
  });
};

