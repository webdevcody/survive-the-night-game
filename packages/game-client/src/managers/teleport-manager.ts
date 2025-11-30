import Vector2 from "@shared/util/vector2";
import { distance } from "@shared/util/physics";
import { getConfig } from "@shared/config";
import PoolManager from "@shared/util/pool-manager";
import { ClientPositionable } from "@/extensions/positionable";
import { PlayerClient } from "@/entities/player";

/**
 * Manages teleport state and progress for the game client
 */
export class TeleportManager {
  private isTeleporting: boolean = false;
  private teleportProgress: number = 0;
  private teleportStartTime: number = 0;
  private teleportCancelledByDamage: boolean = false;
  private readonly TELEPORT_DURATION = 3000; // 3 seconds

  /**
   * Start teleport progress
   */
  startTeleport(
    player: PlayerClient | null,
    getBiomePositions: () => { campsite?: { x: number; y: number } } | null
  ): boolean {
    // Don't restart if already teleporting
    if (this.isTeleporting) {
      return false;
    }

    // Don't start if we just cancelled due to damage (prevents immediate restart if H is still held)
    if (this.teleportCancelledByDamage) {
      return false;
    }

    if (!player || player.isDead()) {
      return false;
    }

    // Check if player is already near the campsite
    const biomePositions = getBiomePositions();
    if (biomePositions?.campsite && player.hasExt(ClientPositionable)) {
      const playerPos = player.getExt(ClientPositionable).getCenterPosition();
      // Convert biome coordinates to world coordinates (center of campsite biome)
      const { BIOME_SIZE, TILE_SIZE } = getConfig().world;
      const campsiteBiomeX = biomePositions.campsite.x;
      const campsiteBiomeY = biomePositions.campsite.y;
      // Calculate center of campsite biome in world coordinates
      const campsiteCenterX = (campsiteBiomeX * BIOME_SIZE + BIOME_SIZE / 2) * TILE_SIZE;
      const campsiteCenterY = (campsiteBiomeY * BIOME_SIZE + BIOME_SIZE / 2) * TILE_SIZE;
      const poolManager = PoolManager.getInstance();
      const campsitePos = poolManager.vector2.claim(campsiteCenterX, campsiteCenterY);

      const distanceToCampsite = distance(playerPos, campsitePos);
      const TELEPORT_MIN_DISTANCE = 200; // Don't allow teleport if within 200 pixels of campsite center

      poolManager.vector2.release(campsitePos);

      if (distanceToCampsite < TELEPORT_MIN_DISTANCE) {
        return false; // Player is too close to campsite, don't allow teleport
      }
    }

    this.isTeleporting = true;
    this.teleportStartTime = Date.now();
    this.teleportProgress = 0;
    this.teleportCancelledByDamage = false; // Reset flag when starting new teleport
    return true;
  }

  /**
   * Cancel teleport and reset progress
   */
  cancelTeleport(): void {
    this.isTeleporting = false;
    this.teleportProgress = 0;
    this.teleportStartTime = 0;
    this.teleportCancelledByDamage = false; // Reset flag
  }

  /**
   * Complete teleport and return true if teleport was completed
   */
  completeTeleport(): boolean {
    if (!this.isTeleporting) {
      return false;
    }

    this.isTeleporting = false;
    this.teleportProgress = 0;
    this.teleportStartTime = 0;
    return true;
  }

  /**
   * Interrupt teleport (called when player takes damage)
   */
  interruptTeleport(): void {
    // Cancel teleport and set flag to prevent immediate restart if H is still held
    if (this.isTeleporting) {
      this.isTeleporting = false;
      this.teleportProgress = 0;
      this.teleportStartTime = 0;
      this.teleportCancelledByDamage = true;
    }
  }

  /**
   * Update teleport progress
   */
  updateProgress(): void {
    if (!this.isTeleporting) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.teleportStartTime;
    this.teleportProgress = Math.min(1, elapsed / this.TELEPORT_DURATION);
  }

  /**
   * Get teleport state for HUD rendering
   */
  getTeleportState(): { isTeleporting: boolean; progress: number } {
    return {
      isTeleporting: this.isTeleporting,
      progress: this.teleportProgress,
    };
  }

  /**
   * Check if teleport is complete (progress >= 1.0)
   */
  isComplete(): boolean {
    return this.teleportProgress >= 1.0;
  }
}

