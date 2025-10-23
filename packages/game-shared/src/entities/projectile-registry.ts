export interface ProjectileAssetConfig {
  assetKey: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  sheet?: string;
}

export interface ProjectileConfig {
  id: string;
  category: "bullet" | "explosive" | "acid";
  assets: ProjectileAssetConfig;
}

class ProjectileRegistry {
  private projectiles = new Map<string, ProjectileConfig>();

  register(config: ProjectileConfig): void {
    this.projectiles.set(config.id, config);
  }

  get(id: string): ProjectileConfig | undefined {
    return this.projectiles.get(id);
  }

  getAll(): ProjectileConfig[] {
    return Array.from(this.projectiles.values());
  }

  getAllProjectileIds(): string[] {
    return Array.from(this.projectiles.keys());
  }

  has(id: string): boolean {
    return this.projectiles.has(id);
  }
}

export const projectileRegistry = new ProjectileRegistry();
