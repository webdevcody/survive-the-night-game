import { GameState } from "@/state";
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
  entities: ClientEntityBase[],
  gameState: GameState
): LightSource[] {
  const sources: LightSource[] = [];
  let addedCurrentPlayerLight = false;

  const currentPlayer = entities.find((e) => e.getId() === gameState.playerId);

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
