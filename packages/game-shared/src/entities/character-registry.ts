export interface CharacterAssetConfig {
  assetPrefix: string;
  frameLayout: {
    startX: number;
    downY: number;
    leftY: number;
    upY: number;
    totalFrames: number;
    sheet: string; // Required - must specify which sprite sheet to use
  };
  deadFrame?: {
    x: number;
    y: number;
    sheet: string; // Required when deadFrame is provided
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
    if (!config.assets.frameLayout.sheet) {
      throw new Error(
        `Character "${config.id}" is missing required 'sheet' property in frameLayout. ` +
          `All characters must specify which sprite sheet to use.`
      );
    }
    if (config.assets.deadFrame && !config.assets.deadFrame.sheet) {
      throw new Error(
        `Character "${config.id}" has deadFrame but is missing required 'sheet' property. ` +
          `When deadFrame is provided, sheet must be specified.`
      );
    }
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
