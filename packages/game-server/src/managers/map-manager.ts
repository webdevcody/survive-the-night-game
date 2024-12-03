import { Tree } from "@/shared/entities/tree";
import { Entities } from "../shared/entities";
import { EntityManager } from "./entity-manager";
import { Wall } from "@/shared/entities/wall";
import { Zombie } from "@/shared/entities/zombie";
import { Weapon } from "@/shared/entities/weapon";

const MAPS = {
  testing: {
    entities: [
      {
        type: Entities.TREE,
        position: { x: 40, y: 40 },
      },
      {
        type: Entities.TREE,
        position: { x: 60, y: 60 },
      },
      {
        type: Entities.TREE,
        position: { x: 80, y: 60 },
      },
      {
        type: Entities.TREE,
        position: { x: 60, y: 100 },
      },
      {
        type: Entities.WALL,
        position: { x: 100, y: 100 },
      },
      {
        type: Entities.WALL,
        position: { x: 40, y: 50 },
      },
      {
        type: Entities.ZOMBIE,
        position: { x: 80, y: 80 },
      },
      {
        type: Entities.WEAPON,
        weaponType: "Knife",
        position: { x: 120, y: 120 },
      },
      {
        type: Entities.WEAPON,
        weaponType: "Pistol",
        position: { x: 100, y: 120 },
      },
      {
        type: Entities.WEAPON,
        weaponType: "Shotgun",
        position: { x: 100, y: 140 },
      },
      {
        type: Entities.WEAPON,
        weaponType: "Knife",
        position: { x: 150, y: 100 },
      },
      {
        type: Entities.WEAPON,
        weaponType: "Pistol",
        position: { x: 150, y: 120 },
      },
      {
        type: Entities.WEAPON,
        weaponType: "Shotgun",
        position: { x: 150, y: 140 },
      },
    ],
    map: [
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    ],
  },
} as const;

type MapId = keyof typeof MAPS;

export class MapManager {
  private map: number[][] = [];
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  public getMap(): number[][] {
    return this.map;
  }

  loadMap(mapId: MapId) {
    const mapToLoad = MAPS[mapId];
    this.entityManager.clear();
    this.map = mapToLoad.map.map((row) => [...row]);

    for (const entity of mapToLoad.entities) {
      const entityPosition = { ...entity.position };
      if (entity.type === Entities.TREE) {
        const tree = new Tree(this.entityManager);
        tree.setPosition(entityPosition);
        this.entityManager.addEntity(tree);
      } else if (entity.type === Entities.WALL) {
        const wall = new Wall(this.entityManager);
        wall.setPosition(entityPosition);
        this.entityManager.addEntity(wall);
      } else if (entity.type === Entities.ZOMBIE) {
        const zombie = new Zombie(this.entityManager);
        zombie.setPosition(entityPosition);
        this.entityManager.addEntity(zombie);
      } else if (entity.type === Entities.WEAPON) {
        const weapon = new Weapon(this.entityManager, entity.weaponType);
        weapon.setPosition(entityPosition);
        this.entityManager.addEntity(weapon);
      }
    }
  }
}
