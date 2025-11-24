export type KeyBindConfig = {
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
};

const DEFAULT_KEYBINDS: KeyBindConfig = {
  moveUp: "KeyW",
  moveDown: "KeyS",
  moveLeft: "KeyA",
  moveRight: "KeyD",
};

const STORAGE_KEY = "KEYBINDING_SETTINGS";

export function loadKeyBinds(): KeyBindConfig {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_KEYBINDS;

    try {
      return { ...DEFAULT_KEYBINDS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_KEYBINDS;
    }
  } else {
    return DEFAULT_KEYBINDS;
  }
}

export function saveKeyBinds(keyboard: Partial<KeyBindConfig>) {
  if (typeof window !== "undefined") {
    const current = loadKeyBinds();
    const updated = { ...current, ...keyboard };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } else {
    return DEFAULT_KEYBINDS;
  }
}
