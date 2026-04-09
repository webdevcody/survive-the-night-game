export interface SquareWorldLayers {
  ground: number[][];
  collidables: number[][];
  spawns: number[][];
  decals: number[][];
}

function assertSquare(layers: SquareWorldLayers, label: string): number {
  const n = layers.ground.length;
  if (
    layers.collidables.length !== n ||
    layers.spawns.length !== n ||
    layers.decals.length !== n
  ) {
    throw new Error(`${label}: layer row counts must match`);
  }
  for (let i = 0; i < n; i++) {
    if (
      layers.ground[i]?.length !== n ||
      layers.collidables[i]?.length !== n ||
      layers.spawns[i]?.length !== n ||
      layers.decals[i]?.length !== n
    ) {
      throw new Error(`${label}: all rows must have length ${n}`);
    }
  }
  return n;
}

/**
 * Pads or copies the world into a larger square grid, centering the old content.
 * `newN` must be >= current side length.
 */
export function resizeSquareLayersCentered(
  layers: SquareWorldLayers,
  newN: number,
  fills: { ground: number; collidables: number; spawns: number; decals: number },
): SquareWorldLayers {
  const oldN = assertSquare(layers, "resizeSquareLayersCentered");
  if (newN < oldN) {
    throw new Error("resizeSquareLayersCentered: new size must be >= current size");
  }
  if (newN === oldN) {
    return {
      ground: layers.ground.map((row) => [...row]),
      collidables: layers.collidables.map((row) => [...row]),
      spawns: layers.spawns.map((row) => [...row]),
      decals: layers.decals.map((row) => [...row]),
    };
  }

  const offset = Math.floor((newN - oldN) / 2);

  const build = (source: number[][], fill: number) => {
    return Array.from({ length: newN }, (_, r) =>
      Array.from({ length: newN }, (_, c) => {
        const sr = r - offset;
        const sc = c - offset;
        if (sr >= 0 && sr < oldN && sc >= 0 && sc < oldN) {
          return source[sr][sc]!;
        }
        return fill;
      }),
    );
  };

  return {
    ground: build(layers.ground, fills.ground),
    collidables: build(layers.collidables, fills.collidables),
    spawns: build(layers.spawns, fills.spawns),
    decals: build(layers.decals, fills.decals),
  };
}

/**
 * Pads the world into a larger square grid with the old content anchored at the top-left (0,0).
 * New cells fill to the right and bottom only, so tile indices for existing content are unchanged.
 * `newN` must be >= current side length.
 */
export function resizeSquareLayersTopLeft(
  layers: SquareWorldLayers,
  newN: number,
  fills: { ground: number; collidables: number; spawns: number; decals: number },
): SquareWorldLayers {
  const oldN = assertSquare(layers, "resizeSquareLayersTopLeft");
  if (newN < oldN) {
    throw new Error("resizeSquareLayersTopLeft: new size must be >= current size");
  }
  if (newN === oldN) {
    return {
      ground: layers.ground.map((row) => [...row]),
      collidables: layers.collidables.map((row) => [...row]),
      spawns: layers.spawns.map((row) => [...row]),
      decals: layers.decals.map((row) => [...row]),
    };
  }

  const build = (source: number[][], fill: number) => {
    return Array.from({ length: newN }, (_, r) =>
      Array.from({ length: newN }, (_, c) => {
        if (r < oldN && c < oldN) {
          return source[r]![c]!;
        }
        return fill;
      }),
    );
  };

  return {
    ground: build(layers.ground, fills.ground),
    collidables: build(layers.collidables, fills.collidables),
    spawns: build(layers.spawns, fills.spawns),
    decals: build(layers.decals, fills.decals),
  };
}
