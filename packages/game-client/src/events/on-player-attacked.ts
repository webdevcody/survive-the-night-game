import { PlayerAttackedEvent } from "../../../game-shared/src/events/server-sent/events/player-attacked-event";
import { PlayerClient } from "@/entities/player";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { SwipeParticle } from "@/particles/swipe";
import { weaponRegistry, WeaponConfig } from "@shared/entities";
import { ClientEventContext } from "./types";

const WEAPON_SHAKE_DURATION_MS = 140;

const applyWeaponCameraShake = (
  context: ClientEventContext,
  attackingPlayerId: number,
  weaponConfig?: WeaponConfig
) => {
  const intensity = weaponConfig?.stats.cameraShakeIntensity;
  if (!intensity || intensity <= 0) {
    return;
  }

  const localPlayerId = context.gameClient.getGameState().playerId;
  if (!localPlayerId || localPlayerId !== attackingPlayerId) {
    return;
  }

  context.gameClient.shakeCamera(intensity, WEAPON_SHAKE_DURATION_MS);
};

export const onPlayerAttacked = (context: ClientEventContext, event: PlayerAttackedEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  const entity = context.gameClient.getEntityById(event.getPlayerId());
  if (!entity) return;

  const player = entity as unknown as PlayerClient;
  // Safety check: ensure player is actually a PlayerClient instance
  if (!(player instanceof PlayerClient) || typeof player.getInput !== "function") return;

  const playerPosition = player.getCenterPosition().clone();

  // Get weapon config to determine sound
  const weaponKey = event.getWeaponKey();
  const weaponConfig = weaponRegistry.get(weaponKey);

  applyWeaponCameraShake(context, event.getPlayerId(), weaponConfig);

  // Play weapon sound if configured
  if (weaponConfig?.sound) {
    context.gameClient
      .getSoundManager()
      .playPositionalSound(weaponConfig.sound as any, playerPosition);
  }

  // Show swipe animation for melee weapons
  if (weaponConfig?.type === "melee") {
    // Use attack direction from event if available, otherwise fall back to player facing
    const attackDirection = event.getAttackDirection() ?? player.getInput().facing;
    const particle = new SwipeParticle(
      context.gameClient.getImageLoader(),
      attackDirection,
      "player"
    );
    particle.setPosition(playerPosition);
    context.gameClient.getParticleManager().addParticle(particle);
  }
};
