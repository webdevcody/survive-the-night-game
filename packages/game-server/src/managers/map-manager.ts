import { Tree } from "../shared/entities/items/tree";
import { EntityManager } from "./entity-manager";
import { Weapon, WEAPON_TYPES } from "../shared/entities/weapon";
import { Boundary } from "../shared/entities/boundary";
import { Zombie } from "../shared/entities/zombie";
import { Positionable } from "../shared/extensions";
import { ServerSocketManager } from "./server-socket-manager";
import { DEBUG_START_ZOMBIE } from "../config";

export const Z_INDEX = {
  GROUND: 0,
  ITEMS: 1,
  BUILDINGS: 2,
  ENEMIES: 3,
  PLAYERS: 4,
  PROJECTILES: 5,
  UI: 6,
};

export const TILE_IDS = {
  GRASS1: 0,
  GRASS2: 1,
  FOREST: 2,
  WATER: 3,
};

const WEAPON_SPAWN_CHANCE = {
  PISTOL: 0.002,
  SHOTGUN: 0.002,
  KNIFE: 0.002,
} as const;

const ZOMBIE_SPAWN_CHANCE = 0.001;

const Biomes = {
  CAMPSITE: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
  ],
  FOREST: [
    [0, 2, 0, 2, 0, 2, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0],
    [0, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 0, 0],
    [2, 2, 2, 0, 0, 0, 0, 0, 0, 2, 0, 2, 2, 2, 2, 2],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 2],
    [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
    [0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2, 2, 0],
    [0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
    [0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 0],
    [2, 2, 2, 2, 0, 0, 2, 0, 0, 0, 2, 2, 2, 2, 2, 0],
    [2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 2],
  ],
  WATER: [
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ],
};

const BIOME_SIZE = 16;
const MAP_SIZE = 5;
export const TILE_SIZE = 16;

export class MapManager {
  private map: number[][] = [];
  private entityManager: EntityManager;
  private socketManager?: ServerSocketManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  public setSocketManager(socketManager: ServerSocketManager) {
    this.socketManager = socketManager;
  }

  public getSocketManager(): ServerSocketManager {
    if (!this.socketManager) {
      throw new Error("MapManager: Socket manager was not set");
    }

    return this.socketManager;
  }

  public getMap(): number[][] {
    return this.map;
  }

  public spawnZombies(dayNumber: number) {
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        if (this.map[y][x] === 0 && Math.random() < ZOMBIE_SPAWN_CHANCE * dayNumber) {
          const zombie = new Zombie(this.entityManager, this, this.getSocketManager());
          zombie.setPosition({ x: x * TILE_SIZE, y: y * TILE_SIZE });
          this.entityManager.addEntity(zombie);
        }
      }
    }
  }

  generateMap() {
    this.entityManager.clear();
    this.entityManager.setMapSize(
      BIOME_SIZE * MAP_SIZE * TILE_SIZE,
      BIOME_SIZE * MAP_SIZE * TILE_SIZE
    );

    const totalSize = BIOME_SIZE * MAP_SIZE;
    this.map = Array(totalSize)
      .fill(0)
      .map(() => Array(totalSize).fill(0));

    // Fill map with biomes
    for (let biomeY = 0; biomeY < MAP_SIZE; biomeY++) {
      for (let biomeX = 0; biomeX < MAP_SIZE; biomeX++) {
        this.placeBiome(biomeX, biomeY);
      }
    }

    // Create boundaries for forest tiles (keeping this as individual tiles)
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        if (this.map[y][x] === TILE_IDS.FOREST) {
          const boundary = new Boundary(this.entityManager);
          boundary.setPosition({ x: x * TILE_SIZE, y: y * TILE_SIZE });
          this.entityManager.addEntity(boundary);
        }
      }
    }

    // Spawn trees randomly in empty spaces
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        if (this.map[y][x] === 0 || this.map[y][x] === 1) {
          if (Math.random() < 0.05) {
            // 30% chance for a tree
            const tree = new Tree(this.entityManager);
            tree.getExt(Positionable).setPosition({ x: x * TILE_SIZE, y: y * TILE_SIZE });
            this.entityManager.addEntity(tree);
          } else if (Math.random() < WEAPON_SPAWN_CHANCE.PISTOL) {
            // 0.1% chance for a pistol
            const weapon = new Weapon(this.entityManager, WEAPON_TYPES.PISTOL);
            weapon.getExt(Positionable).setPosition({ x: x * TILE_SIZE, y: y * TILE_SIZE });
            this.entityManager.addEntity(weapon);
          } else if (Math.random() < WEAPON_SPAWN_CHANCE.SHOTGUN) {
            // 0.1% chance for a shotgun
            const weapon = new Weapon(this.entityManager, WEAPON_TYPES.SHOTGUN);
            weapon.getExt(Positionable).setPosition({ x: x * TILE_SIZE, y: y * TILE_SIZE });
            this.entityManager.addEntity(weapon);
          } else if (Math.random() < WEAPON_SPAWN_CHANCE.KNIFE) {
            // 0.1% chance for a knife
            const weapon = new Weapon(this.entityManager, WEAPON_TYPES.KNIFE);
            weapon.getExt(Positionable).setPosition({ x: x * TILE_SIZE, y: y * TILE_SIZE });
            this.entityManager.addEntity(weapon);
          }
        }
      }
    }

    if (DEBUG_START_ZOMBIE) {
      const middleX = Math.floor(totalSize / 2) * TILE_SIZE;
      const middleY = Math.floor(totalSize / 2) * TILE_SIZE;

      const zombie = new Zombie(this.entityManager, this, this.getSocketManager());
      zombie.setPosition({ x: middleX + 16 * 4, y: middleY });
      this.entityManager.addEntity(zombie);
    }
  }

  private placeBiome(biomeX: number, biomeY: number) {
    // Place forest biomes around the edges
    if (biomeX === 0 || biomeX === MAP_SIZE - 1 || biomeY === 0 || biomeY === MAP_SIZE - 1) {
      // Place forest biome
      for (let y = 0; y < BIOME_SIZE; y++) {
        for (let x = 0; x < BIOME_SIZE; x++) {
          const mapY = biomeY * BIOME_SIZE + y;
          const mapX = biomeX * BIOME_SIZE + x;
          this.map[mapY][mapX] = TILE_IDS.FOREST;
        }
      }
      return;
    }

    // Adjust the center position for the campsite (now at 3,3 due to water border)
    const biome =
      biomeX === Math.floor(MAP_SIZE / 2) && biomeY === Math.floor(MAP_SIZE / 2)
        ? Biomes.CAMPSITE
        : Biomes.FOREST;

    for (let y = 0; y < BIOME_SIZE; y++) {
      for (let x = 0; x < BIOME_SIZE; x++) {
        const mapY = biomeY * BIOME_SIZE + y;
        const mapX = biomeX * BIOME_SIZE + x;
        this.map[mapY][mapX] = biome[y][x];
      }
    }
  }
}
