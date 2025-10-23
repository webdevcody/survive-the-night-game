export interface CharacterAssetConfig {
  assetPrefix: string;
  frameLayout: {
    startX: number;
    downY: number;
    leftY: number;
    upY: number;
    totalFrames: number;
    sheet?: string;
  };
  deadFrame?: {
    x: number;
    y: number;
    sheet?: string;
  };
}

export interface CharacterConfig {
  id: string;
  category: "player" | "npc";
  assets: CharacterAssetConfig;
}

class CharacterRegistry {
  private characters = new Map<string, CharacterConfig>();

  register(config: CharacterConfig): void {
    this.characters.set(config.id, config);
  }

  get(id: string): CharacterConfig | undefined {
    return this.characters.get(id);
  }

  getAll(): CharacterConfig[] {
    return Array.from(this.characters.values());
  }

  getAllCharacterIds(): string[] {
    return Array.from(this.characters.keys());
  }

  has(id: string): boolean {
    return this.characters.has(id);
  }
}

export const characterRegistry = new CharacterRegistry();
