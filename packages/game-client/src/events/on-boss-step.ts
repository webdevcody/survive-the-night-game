import { BossStepEvent } from "../../../game-shared/src/events/server-sent/events/boss-step-event";
import { ClientEventContext } from "./types";

export const onBossStep = (context: ClientEventContext, event: BossStepEvent) => {
  context.gameClient.shakeCamera(event.getIntensity(), event.getDurationMs());
};
