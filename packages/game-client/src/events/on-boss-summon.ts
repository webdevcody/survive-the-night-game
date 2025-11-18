import { BossSummonEvent } from "../../../game-shared/src/events/server-sent/events/boss-summon-event";
import { SummonParticle } from "@/particles/summon";
import Vector2 from "@shared/util/vector2";
import { ClientEventContext } from "./types";

export const onBossSummon = (context: ClientEventContext, event: BossSummonEvent) => {
  const summons = event.getSummons();
  summons.forEach((summon) => {
    const particle = new SummonParticle(
      context.gameClient.getImageLoader(),
      context.gameClient.getSoundManager()
    );
    particle.setPosition(new Vector2(summon.x, summon.y));
    particle.onInitialized();
    context.gameClient.getParticleManager().addParticle(particle);
  });
};
