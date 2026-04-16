import { describe, expect, it } from "vitest";
import { getEditorDecalSpriteBlit } from "./editor-decal-sprite";
import { DECAL_TILE_WORKBENCH } from "./decal-palette";

describe("getEditorDecalSpriteBlit", () => {
  const map = { groundCols: 10, groundRows: 3, collidablesCols: 10, collidablesRows: 40 };

  it("returns items-sheet crop for workbench", () => {
    const b = getEditorDecalSpriteBlit(DECAL_TILE_WORKBENCH, map);
    expect(b).not.toBeNull();
    expect(b!.sheet).toBe("items");
    expect(b!.sw).toBeGreaterThan(0);
  });
});
