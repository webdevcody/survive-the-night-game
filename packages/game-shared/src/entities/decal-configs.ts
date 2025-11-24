import { DecalConfig } from "./decal-registry";

export const DECAL_CONFIGS: Record<string, DecalConfig> = {
  flame: {
    id: "flame",
    category: "effect",
    assets: {
      assetKey: "flame",
      type: "animated",
      frameCount: 5,
      frameLayout: {
        startX: 0,
        startY: 80,
        sheet: "items",
      },
    },
  },
  blood: {
    id: "blood",
    category: "effect",
    assets: {
      assetKey: "blood",
      type: "single",
      position: {
        x: 0,
        y: 256,
        sheet: "ground",
      },
    },
    blocksPlacement: false,
  },
  acid: {
    id: "acid",
    category: "effect",
    assets: {
      assetKey: "acid",
      type: "single",
      position: {
        x: 16,
        y: 256,
        sheet: "ground",
      },
    },
    blocksPlacement: false,
  },
  explosion: {
    id: "explosion",
    category: "effect",
    assets: {
      assetKey: "explosion",
      type: "animated",
      frameCount: 5,
      frameLayout: {
        startX: 0,
        startY: 128,
        sheet: "items",
      },
    },
  },
  swing: {
    id: "swing",
    category: "animation",
    assets: {
      assetKey: "swing",
      type: "directional",
      directionalFrames: {
        startX: 0,
        startY: 96,
        totalFrames: 4,
        sheet: "items",
      },
    },
  },
  zombie_swing: {
    id: "zombie_swing",
    category: "animation",
    assets: {
      assetKey: "zombie_swing",
      type: "directional",
      directionalFrames: {
        startX: 0,
        startY: 112,
        totalFrames: 4,
        sheet: "items",
      },
    },
  },
};
