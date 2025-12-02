export type KeyBindConfig = {
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  interact: string;
  drop: string;
  quickHeal: string;
  teleport: string;
  splitDrop: string;
  weaponsHud: string;
  quickSwitch: string;
  sprint: string;
  fire: string;
  toggleInstructions: string;
  toggleMute: string;
  playerList: string;
  escape: string;
  chat: string;
};

const DEFAULT_KEYBINDS: KeyBindConfig = {
  moveUp: "KeyW",
  moveDown: "KeyS",
  moveLeft: "KeyA",
  moveRight: "KeyD",
  interact: "KeyE",
  drop: "KeyG",
  quickHeal: "KeyH",
  teleport: "KeyC",
  splitDrop: "KeyX",
  weaponsHud: "KeyF",
  quickSwitch: "KeyQ",
  sprint: "ShiftLeft",
  fire: "Space",
  toggleInstructions: "KeyI",
  toggleMute: "KeyN",
  playerList: "Tab",
  escape: "Escape",
  chat: "KeyY",
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
