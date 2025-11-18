import { ExplosionEvent } from "@shared/events/server-sent/explosion-event";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { ExplosionParticle } from "@/particles/explosion";
import Vector2 from "@shared/util/vector2";
import { distance } from "@shared/util/physics";
import { ClientEventContext } from "./types";

const EXPLOSION_SHAKE_MAX_DISTANCE = 640;
const EXPLOSION_SHAKE_DURATION_MS = 240;
const EXPLOSION_SHAKE_MAX_INTENSITY = 5.5;

const applyExplosionCameraShake = (context: ClientEventContext, explosionPosition: Vector2) => {
  const localPlayer = context.gameClient.getMyPlayer();
  if (!localPlayer) {
    return;
  }

  const playerPosition = localPlayer.getCenterPosition();
  const distToPlayer = distance(playerPosition, explosionPosition);
  if (distToPlayer > EXPLOSION_SHAKE_MAX_DISTANCE) {
    return;
  }

  const proximity = 1 - distToPlayer / EXPLOSION_SHAKE_MAX_DISTANCE;
  const intensity = EXPLOSION_SHAKE_MAX_INTENSITY * proximity;
  if (intensity > 0) {
    context.gameClient.shakeCamera(intensity, EXPLOSION_SHAKE_DURATION_MS);
  }
};

export const onExplosion = (context: ClientEventContext, event: ExplosionEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  const particle = new ExplosionParticle(
    context.gameClient.getImageLoader(),
    context.gameClient.getSoundManager()
  );
  const serialized = event.serialize();
  const explosionPosition = new Vector2(serialized.position.x, serialized.position.y);
  particle.setPosition(explosionPosition);
  particle.onInitialized();
  context.gameClient.getParticleManager().addParticle(particle);

  applyExplosionCameraShake(context, explosionPosition);
};

