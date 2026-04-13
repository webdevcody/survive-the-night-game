import { ClientPositionable } from "@/extensions";
import { BossStepEvent } from "../../../game-shared/src/events/server-sent/events/boss-step-event";
import { distance } from "@shared/util/physics";
import { ClientEventContext } from "./types";

/** Pixels — only players this close to the boss feel footstep shake (matches explosion radius). */
const BOSS_STEP_SHAKE_MAX_DISTANCE = 640;

export const onBossStep = (context: ClientEventContext, event: BossStepEvent) => {
  const localPlayer = context.gameClient.getMyPlayer();
  if (!localPlayer) {
    return;
  }

  const boss = context.gameClient.getEntityById(event.getBossId());
  if (!boss?.hasExt(ClientPositionable)) {
    return;
  }

  const bossPosition = boss.getExt(ClientPositionable).getCenterPosition();
  const playerPosition = localPlayer.getCenterPosition();
  const distToPlayer = distance(playerPosition, bossPosition);
  if (distToPlayer > BOSS_STEP_SHAKE_MAX_DISTANCE) {
    return;
  }

  const proximity = 1 - distToPlayer / BOSS_STEP_SHAKE_MAX_DISTANCE;
  const intensity = event.getIntensity() * proximity;
  if (intensity > 0) {
    context.gameClient.shakeCamera(intensity, event.getDurationMs());
  }
};
