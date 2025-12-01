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
    toxicGas: string;
    [key: string]: string;
  };
  fogOfWar: {
    enabled: boolean;
    fogColor: string;
  };
  scale?: number; // For minimap
}

/**
 * Calculate light sources from entities for fog of war rendering
 */
export function calculateLightSources(
  entities: ClientEntityBase[],
  gameState: GameState
): LightSource[] {
  const sources: LightSource[] = [];
  const isBattleRoyale = gameState.gameMode === "battle_royale";
  const isInfection = gameState.gameMode === "infection";
  let addedCurrentPlayerLight = false;

  // Check if current player is a zombie (for infection mode visibility)
  const currentPlayer = entities.find((e) => e.getId() === gameState.playerId);
  const myPlayerIsZombie =
    currentPlayer instanceof PlayerClient && currentPlayer.isZombiePlayer?.();

  // Add entity light sources (torches, campfires, etc.)
  for (const entity of entities) {
    if (entity.hasExt(ClientIlluminated) && entity.hasExt(ClientPositionable)) {
      // In Battle Royale, hide other players' light sources to not reveal their position
      if (
        isBattleRoyale &&
        entity instanceof PlayerClient &&
        entity.getId() !== gameState.playerId
      ) {
        continue;
      }

      // In Infection mode, zombie players can see all illuminated players' light sources
      if (isInfection && myPlayerIsZombie && entity instanceof PlayerClient) {
        const radius = entity.getExt(ClientIlluminated).getRadius();
        if (radius > 0) {
          const position = entity.getExt(ClientPositionable).getCenterPosition();
          sources.push({ position, radius });
        }
        if (entity.getId() === gameState.playerId) {
          addedCurrentPlayerLight = true;
        }
        continue;
      }

      const radius = entity.getExt(ClientIlluminated).getRadius();
      // Skip entities with no light (radius 0 or very small)
      if (radius <= 0) continue;
      const position = entity.getExt(ClientPositionable).getCenterPosition();
      sources.push({ position, radius });

      // Track if we added light for the current player
      if (entity.getId() === gameState.playerId) {
        addedCurrentPlayerLight = true;
      }
    }
  }

  // Add illumination for zombie players who don't have ClientIlluminated extension
  // This ensures zombie players can always see their surroundings on the map
  if (!addedCurrentPlayerLight && gameState.playerId) {
    if (currentPlayer instanceof PlayerClient && currentPlayer.isZombiePlayer?.()) {
      if (currentPlayer.hasExt(ClientPositionable)) {
        const position = currentPlayer.getExt(ClientPositionable).getCenterPosition();
        const radius = 80; // Match ZOMBIE_ILLUMINATION_RADIUS from map manager
        sources.push({ position, radius });
      }
    }
  }

  // For zombie players in infection mode, add ALL human player positions as light sources
  // This ensures zombies can see human players through the fog of war
  if (isInfection && myPlayerIsZombie) {
    for (const entity of entities) {
      if (
        entity instanceof PlayerClient &&
        entity.getId() !== gameState.playerId &&
        !entity.isZombiePlayer() &&
        entity.hasExt(ClientPositionable)
      ) {
        const position = entity.getExt(ClientPositionable).getCenterPosition();
        // Use a small radius so only the player dot is visible, not a large area
        sources.push({ position, radius: 20 });
      }
    }
  }

  return sources;
}

/**
 * Check if a world position is visible (within any light source radius)
 */
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

/**
 * Convert world coordinates to map coordinates
 */
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

/**
 * Convert map coordinates back to world coordinates
 */
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
