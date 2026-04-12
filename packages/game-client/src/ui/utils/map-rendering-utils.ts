import { GameState, getEntitiesByType, getEntityById } from "@/state";
import { ClientPositionable } from "@/extensions/positionable";
import { PlayerClient } from "@/entities/player";
import { ClientIlluminated } from "@/extensions/illuminated";
import Vector2 from "@shared/util/vector2";
import { distance } from "@shared/util/physics";
import { ClientEntityBase } from "@/extensions/client-entity";

export interface LightSource {
  position: Vector2;
  radius: number;
}

export interface MapRenderingSettings {
  colors: {
    [key: string]: string;
  };
  fogOfWar: {
    enabled: boolean;
    fogColor: string;
  };
  scale?: number;
}

/**
 * Calculate light sources from entities for fog of war rendering
 */
export function calculateLightSources(
  entities: readonly ClientEntityBase[],
  gameState: GameState
): LightSource[] {
  const sources: LightSource[] = [];
  let addedCurrentPlayerLight = false;

  const currentPlayer = getEntityById(gameState, gameState.playerId);

  for (const entity of entities) {
    if (entity.hasExt(ClientIlluminated) && entity.hasExt(ClientPositionable)) {
      const radius = entity.getExt(ClientIlluminated).getRadius();
      if (radius <= 0) continue;
      const position = entity.getExt(ClientPositionable).getCenterPosition();
      sources.push({ position, radius });

      if (entity.getId() === gameState.playerId) {
        addedCurrentPlayerLight = true;
      }
    }
  }

  if (!addedCurrentPlayerLight && gameState.playerId) {
    if (currentPlayer instanceof PlayerClient && currentPlayer.isZombiePlayer?.()) {
      if (currentPlayer.hasExt(ClientPositionable)) {
        const position = currentPlayer.getExt(ClientPositionable).getCenterPosition();
        const radius = 80;
        sources.push({ position, radius });
      }
    }
  }

  return sources;
}

/**
 * World position for the campsite (H) map marker: the actual campfire entity when present,
 * otherwise the biome cell center (fire is offset inside the biome, so center is wrong).
 */
export function getCampsiteMapMarkerWorldPosition(
  gameState: GameState,
  campsiteBiomeCell: { x: number; y: number },
  biomeSize: number,
  tileSize: number
): { x: number; y: number } {
  const fires = getEntitiesByType(gameState, "campsite_fire");
  for (const entity of fires) {
    if (entity.hasExt(ClientPositionable)) {
      return entity.getExt(ClientPositionable).getCenterPosition();
    }
  }
  return {
    x: (campsiteBiomeCell.x * biomeSize + biomeSize / 2) * tileSize,
    y: (campsiteBiomeCell.y * biomeSize + biomeSize / 2) * tileSize,
  };
}

export function isPositionVisible(worldPos: Vector2, lightSources: LightSource[]): boolean {
  for (const source of lightSources) {
    const radius = source.radius / Math.sqrt(2);
    const dist = distance(worldPos, source.position);

    if (dist <= radius) {
      return true;
    }
  }
  return false;
}

export function worldToMapCoordinates(
  worldX: number,
  worldY: number,
  playerPos: { x: number; y: number },
  centerX: number,
  centerY: number,
  scale: number
): { x: number; y: number } {
  const relativeX = worldX - playerPos.x;
  const relativeY = worldY - playerPos.y;
  return {
    x: centerX + relativeX * scale,
    y: centerY + relativeY * scale,
  };
}

export function mapToWorldCoordinates(
  mapX: number,
  mapY: number,
  playerPos: { x: number; y: number },
  centerX: number,
  centerY: number,
  scale: number
): { x: number; y: number } {
  const relativeX = (mapX - centerX) / scale;
  const relativeY = (mapY - centerY) / scale;
  return {
    x: playerPos.x + relativeX,
    y: playerPos.y + relativeY,
  };
}
