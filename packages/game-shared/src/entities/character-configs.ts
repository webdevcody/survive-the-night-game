import { CharacterConfig } from "./character-registry";

export const CHARACTER_CONFIGS: Record<string, CharacterConfig> = {
  player: {
    id: "player",
    category: "player",
    assets: {
      assetPrefix: "player",
      frameLayout: {
        startX: 0,
        downY: 112,
        leftY: 128,
        upY: 96,
        totalFrames: 3,
        sheet: "characters",
      },
    },
  },
  player_wdc: {
    id: "player_wdc",
    category: "player",
    assets: {
      assetPrefix: "player_wdc",
      frameLayout: {
        startX: 64,
        downY: 112,
        leftY: 128,
        upY: 96,
        totalFrames: 3,
        sheet: "characters",
      },
      deadFrame: {
        x: 493,
        y: 190,
        sheet: "default",
      },
    },
  },
  survivor: {
    id: "survivor",
    category: "npc",
    assets: {
      assetPrefix: "survivor",
      frameLayout: {
        startX: 0,
        downY: 112,
        leftY: 128,
        upY: 96,
        totalFrames: 3,
        sheet: "characters",
      },
      deadFrame: {
        x: 493,
        y: 190,
        sheet: "default",
      },
    },
  },
};
