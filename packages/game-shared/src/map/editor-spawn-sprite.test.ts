import { describe, expect, it } from "vitest";
import { getEditorSpawnSpriteBlit } from "./editor-spawn-sprite";
import { SPAWN_TILE_PLAYER } from "./spawn-palette";

describe("getEditorSpawnSpriteBlit", () => {
  it("returns characters-sheet crop for player spawn", () => {
    const b = getEditorSpawnSpriteBlit(SPAWN_TILE_PLAYER);
    expect(b).not.toBeNull();
    expect(b!.sheet).toBe("characters");
    expect(b!.sw).toBeGreaterThan(0);
    expect(b!.sh).toBeGreaterThan(0);
  });

  it("returns items-sheet crop for first item fixture tile when defined", () => {
    const b = getEditorSpawnSpriteBlit(7);
    expect(b).not.toBeNull();
    expect(b!.sheet).toBe("items");
  });
});
