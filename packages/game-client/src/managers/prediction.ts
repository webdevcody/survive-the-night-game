import { Input } from "@shared/util/input";
import Vector2 from "@shared/util/vector2";
import { PlayerClient } from "@/entities/player";
import { normalizeVector, isColliding } from "@shared/util/physics";
import { ClientMovable } from "@/extensions/movable";
import { ClientPositionable } from "@/extensions/positionable";
import { ClientCollidable } from "@/extensions/collidable";
import { TILE_SIZE, RECONCILIATION_LERP_SPEED } from "@shared/constants/constants";
import { PREDICTION_CONFIG } from "@/config/client-prediction";
import { ClientEntityBase } from "@/extensions/client-entity";
import { Hitbox } from "@shared/util/hitbox";

type PredictionConfig = {
  playerSpeed: number; // pixels per second
  sprintMultiplier: number;
};

export class PredictionManager {
  private readonly config: PredictionConfig;

  constructor(config: Partial<PredictionConfig> = {}) {
    this.config = { ...PREDICTION_CONFIG, ...config };
  }

  predictLocalPlayerMovement(
    player: PlayerClient,
    input: Input,
    deltaSeconds: number,
    collidables: number[][] | null = null,
    entities: ClientEntityBase[] = []
  ): void {
    if (deltaSeconds <= 0) return;

    // If no movement input, don't adjust position
    if (input.dx === 0 && input.dy === 0) {
      return;
    }

    const currentPosition = player.getPosition();
    const direction = normalizeVector(new Vector2(input.dx, input.dy));

    const canSprint = input.sprint; // Client-side approximation (server is authoritative)
    const speedMultiplier = canSprint ? this.config.sprintMultiplier : 1;

    const speed = this.config.playerSpeed * speedMultiplier;
    let moveX = direction.x * speed * deltaSeconds;
    let moveY = direction.y * speed * deltaSeconds;

    let nextX = currentPosition.x + moveX;
    let nextY = currentPosition.y;

    if (collidables && player.hasExt(ClientCollidable) && player.hasExt(ClientPositionable)) {
      const { blocked, adjusted } = this.blockIfCollides(player, nextX, nextY, collidables, entities);
      if (blocked) {
        nextX = adjusted.x;
        moveX = nextX - currentPosition.x;
      }
    }

    nextY = currentPosition.y + moveY;
    if (collidables && player.hasExt(ClientCollidable) && player.hasExt(ClientPositionable)) {
      const { blocked, adjusted } = this.blockIfCollides(player, nextX, nextY, collidables, entities);
      if (blocked) {
        nextY = adjusted.y;
        moveY = nextY - currentPosition.y;
      }
    }

    const next = new Vector2(nextX, nextY);
    player.setPosition(next);

    // Update client-side velocity to reflect actual allowed move
    if (player.hasExt(ClientMovable)) {
      const actualDx = moveX / Math.max(deltaSeconds, 1e-6);
      const actualDy = moveY / Math.max(deltaSeconds, 1e-6);
      player.getExt(ClientMovable).setVelocity(new Vector2(actualDx, actualDy));
    }
  }

  private blockIfCollides(
    player: PlayerClient,
    proposedX: number,
    proposedY: number,
    collidables: number[][],
    entities: ClientEntityBase[]
  ): { blocked: boolean; adjusted: { x: number; y: number } } {
    const positionable = player.getExt(ClientPositionable);
    const collidable = player.getExt(ClientCollidable);

    const size = collidable.getSize();
    const currentPos = positionable.getPosition();
    const currentHit = collidable.getHitBox();
    const offsetX = currentHit.x - currentPos.x;
    const offsetY = currentHit.y - currentPos.y;

    const hitbox = {
      x: proposedX + offsetX,
      y: proposedY + offsetY,
      width: size.x,
      height: size.y,
    };

    // Check collision with map tiles
    if (this.overlapsAnyCollidable(hitbox, collidables)) {
      return { blocked: true, adjusted: { x: currentPos.x, y: currentPos.y } };
    }

    // Check collision with entities
    if (this.overlapsAnyEntity(hitbox, entities, player.getId())) {
      return { blocked: true, adjusted: { x: currentPos.x, y: currentPos.y } };
    }

    return { blocked: false, adjusted: { x: proposedX, y: proposedY } };
  }

  /**
   * Reconciles the local player's position towards the server's authoritative position
   * using a smooth lerp. This runs after client prediction to gradually correct
   * any divergence between client and server positions.
   */
  reconcileWithServerPosition(player: PlayerClient): void {
    // Get the server's authoritative position (if available)
    const serverPos = (player as any).serverGhostPos as Vector2 | null;

    if (!serverPos || !player.hasExt(ClientPositionable)) {
      return;
    }

    const currentPos = player.getExt(ClientPositionable).getPosition();

    // Lerp towards server position
    const lerpedX = currentPos.x + (serverPos.x - currentPos.x) * RECONCILIATION_LERP_SPEED;
    const lerpedY = currentPos.y + (serverPos.y - currentPos.y) * RECONCILIATION_LERP_SPEED;

    player.setPosition(new Vector2(lerpedX, lerpedY));
  }

  private overlapsAnyCollidable(
    hit: { x: number; y: number; width: number; height: number },
    grid: number[][]
  ): boolean {
    const minCol = Math.max(0, Math.floor(hit.x / TILE_SIZE));
    const minRow = Math.max(0, Math.floor(hit.y / TILE_SIZE));
    const maxCol = Math.min(
      grid[0]?.length ? grid[0].length - 1 : 0,
      Math.floor((hit.x + hit.width - 1) / TILE_SIZE)
    );
    const maxRow = Math.min(
      grid.length ? grid.length - 1 : 0,
      Math.floor((hit.y + hit.height - 1) / TILE_SIZE)
    );

    for (let r = minRow; r <= maxRow; r++) {
      const row = grid[r];
      if (!row) continue;
      for (let c = minCol; c <= maxCol; c++) {
        const tile = row[c];
        if (tile !== -1) return true;
      }
    }
    return false;
  }

  private overlapsAnyEntity(
    playerHitbox: Hitbox,
    entities: ClientEntityBase[],
    playerEntityId: string
  ): boolean {
    for (const entity of entities) {
      // Skip the player entity itself
      if (entity.getId() === playerEntityId) {
        continue;
      }

      // Only check collision with entities that have collidable extension
      if (!entity.hasExt(ClientCollidable)) {
        continue;
      }

      const collidable = entity.getExt(ClientCollidable);

      // Skip if collision is disabled for this entity
      if (!collidable.isEnabled()) {
        continue;
      }

      const entityHitbox = collidable.getHitBox();

      if (isColliding(playerHitbox, entityHitbox)) {
        return true;
      }
    }

    return false;
  }
}
