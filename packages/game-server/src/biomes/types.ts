import { EntityType } from "@shared/types/entity";
import { DecalData } from "@shared/config/decals-config";

export interface BiomeData {
  ground: number[][];
  collidables: number[][];
  decals?: DecalData[];
  items?: EntityType[];
}
