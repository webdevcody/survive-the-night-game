import { EntityType } from "@shared/types/entity";

export interface BiomeData {
  ground: number[][];
  collidables: number[][];
  items?: EntityType[];
}
