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
        startX: 85,
        startY: 266,
        sheet: "default",
      },
    },
  },
  fire: {
    id: "fire",
    category: "effect",
    assets: {
      assetKey: "fire",
      type: "single",
      position: {
        x: 51,
        y: 265,
        sheet: "default",
      },
    },
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
  spikes: {
    id: "spikes",
    category: "structure",
    assets: {
      assetKey: "spikes",
      type: "single",
      position: {
        x: 357,
        y: 57,
        sheet: "default",
      },
    },
  },
};
