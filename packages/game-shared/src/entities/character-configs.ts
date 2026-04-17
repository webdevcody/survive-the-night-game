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
        sheet: "characters",
      },
    },
  },
  player_survivor: {
    id: "player_survivor",
    category: "player",
    assets: {
      assetPrefix: "player_survivor",
      frameLayout: {
        startX: 0,
        downY: 144,
        leftY: 160,
        upY: 176,
        totalFrames: 3,
        sheet: "characters",
      },
    },
  },
  player_scavenger: {
    id: "player_scavenger",
    category: "player",
    assets: {
      assetPrefix: "player_scavenger",
      frameLayout: {
        startX: 64,
        downY: 144,
        leftY: 160,
        upY: 176,
        totalFrames: 3,
        sheet: "characters",
      },
    },
  },
  player_medic: {
    id: "player_medic",
    category: "player",
    assets: {
      assetPrefix: "player_medic",
      frameLayout: {
        startX: 112,
        downY: 144,
        leftY: 160,
        upY: 176,
        totalFrames: 3,
        sheet: "characters",
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
        sheet: "characters",
      },
    },
  },
  dialogue_survivor_npc: {
    id: "dialogue_survivor_npc",
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
        sheet: "characters",
      },
    },
  },
};
