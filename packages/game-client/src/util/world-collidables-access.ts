let getCollidablesLayer: (() => number[][] | null) | null = null;

/** Wired from `GameClient` so environment entities can align with the collidables layer. */
export function registerWorldCollidablesAccess(getter: () => number[][] | null): void {
  getCollidablesLayer = getter;
}

export function tryGetWorldCollidables(): number[][] | null {
  return getCollidablesLayer?.() ?? null;
}
