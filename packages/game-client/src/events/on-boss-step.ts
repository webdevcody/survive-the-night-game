import { BossStepEvent } from "@shared/events/server-sent/boss-step-event";
import { ClientEventContext } from "./types";

export const onBossStep = (context: ClientEventContext, event: BossStepEvent) => {
  context.gameClient.shakeCamera(event.getIntensity(), event.getDurationMs());
};

