import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import Positionable from "@/extensions/positionable";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { ToxicGasCloudExtension } from "@/extensions/toxic-gas-cloud-extension";
import { getConfig } from "@shared/config";

/**
 * Toxic gas cloud entity that spreads across the map and poisons players
 */
export class ToxicGasCloud extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  private environmentalEventManager: any = null; // Will be set by EnvironmentalEventManager

  constructor(gameManagers: IGameManagers, position: Vector2) {
    super(gameManagers, "toxic_gas_cloud" as any);

    const poolManager = PoolManager.getInstance();
    const tileSize = getConfig().world.TILE_SIZE;
    const size = poolManager.vector2.claim(tileSize, tileSize);
    this.addExtension(new Positionable(this).setSize(size).setPosition(position));

    // Add the cloud extension that handles growth and poison logic
    this.addExtension(new ToxicGasCloudExtension(this));
  }

  /**
   * Set the environmental event manager reference (called by EnvironmentalEventManager)
   */
  public setEnvironmentalEventManager(manager: any): void {
    this.environmentalEventManager = manager;
  }

  /**
   * Get the environmental event manager reference
   */
  public getEnvironmentalEventManager(): any {
    return this.environmentalEventManager;
  }

  /**
   * Set whether this cloud can reproduce (spawn new clouds)
   */
  public setCanReproduce(canReproduce: boolean): void {
    if (this.hasExt(ToxicGasCloudExtension)) {
      this.getExt(ToxicGasCloudExtension).setCanReproduce(canReproduce);
    }
  }

  /**
   * Set whether this is an original spawn cloud
   */
  public setIsOriginalCloud(isOriginal: boolean): void {
    if (this.hasExt(ToxicGasCloudExtension)) {
      this.getExt(ToxicGasCloudExtension).setIsOriginalCloud(isOriginal);
    }
  }

  /**
   * Set primary growth direction
   */
  public setPrimaryDirection(direction: { x: number; y: number }): void {
    if (this.hasExt(ToxicGasCloudExtension)) {
      this.getExt(ToxicGasCloudExtension).setPrimaryDirection(direction);
    }
  }
}
