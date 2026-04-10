import { describe, expect, it } from "vitest";
import {
  extractDialogueNpcsFromSidecarJson,
  extractQuestsFromSidecarJson,
  mergeWorldMapMainWithSidecars,
  stripWorldMapSidecarsForMainFile,
} from "./world-map-sidecars";

describe("extractDialogueNpcsFromSidecarJson", () => {
  it("accepts bare array", () => {
    const arr = [{ row: 0, col: 0 }];
    expect(extractDialogueNpcsFromSidecarJson(arr)).toBe(arr);
  });

  it("accepts wrapped dialogueNpcs", () => {
    const arr = [{ row: 1, col: 2 }];
    expect(extractDialogueNpcsFromSidecarJson({ dialogueNpcs: arr })).toBe(arr);
  });

  it("returns undefined for invalid shape", () => {
    expect(extractDialogueNpcsFromSidecarJson({})).toBeUndefined();
    expect(extractDialogueNpcsFromSidecarJson(null)).toBeUndefined();
  });
});

describe("extractQuestsFromSidecarJson", () => {
  it("accepts bare array", () => {
    const arr = [{ id: "q1", title: "T", steps: [], rewards: [] }];
    expect(extractQuestsFromSidecarJson(arr)).toBe(arr);
  });

  it("accepts wrapped quests", () => {
    const arr = [{ id: "q2", title: "T2", steps: [], rewards: [] }];
    expect(extractQuestsFromSidecarJson({ quests: arr })).toBe(arr);
  });

  it("returns undefined for invalid shape", () => {
    expect(extractQuestsFromSidecarJson({})).toBeUndefined();
  });
});

describe("mergeWorldMapMainWithSidecars", () => {
  it("uses embedded main when sidecar files missing (null)", () => {
    const main = {
      dialogueNpcs: [{ row: 0, col: 0 }],
      quests: [{ id: "a", title: "", steps: [], rewards: [] }],
    };
    const m = mergeWorldMapMainWithSidecars(main, null, null);
    expect(m.dialogueNpcs).toEqual(main.dialogueNpcs);
    expect(m.quests).toEqual(main.quests);
  });

  it("sidecar overrides embedded when file was read", () => {
    const main = {
      dialogueNpcs: [{ row: 0, col: 0 }],
      quests: [{ id: "old", title: "", steps: [], rewards: [] }],
    };
    const m = mergeWorldMapMainWithSidecars(
      main,
      { dialogueNpcs: [{ row: 9, col: 9 }] },
      { quests: [{ id: "new", title: "", steps: [], rewards: [] }] },
    );
    expect(m.dialogueNpcs).toEqual([{ row: 9, col: 9 }]);
    expect(m.quests).toEqual([{ id: "new", title: "", steps: [], rewards: [] }]);
  });

  it("bare array sidecar overrides main", () => {
    const main = { dialogueNpcs: [{ row: 0, col: 0 }], quests: [] };
    const m = mergeWorldMapMainWithSidecars(main, [{ row: 3, col: 3 }], null);
    expect(m.dialogueNpcs).toEqual([{ row: 3, col: 3 }]);
  });

  it("empty sidecar object yields empty arrays", () => {
    const main = {
      dialogueNpcs: [{ row: 0, col: 0 }],
      quests: [{ id: "x", title: "", steps: [], rewards: [] }],
    };
    const m = mergeWorldMapMainWithSidecars(main, {}, {});
    expect(m.dialogueNpcs).toEqual([]);
    expect(m.quests).toEqual([]);
  });
});

describe("stripWorldMapSidecarsForMainFile", () => {
  it("removes dialogueNpcs and quests keys", () => {
    const data = {
      ground: [[0]],
      dialogueNpcs: [],
      quests: [],
      extra: 1,
    };
    const stripped = stripWorldMapSidecarsForMainFile(data);
    expect(stripped).toEqual({ ground: [[0]], extra: 1 });
    expect("dialogueNpcs" in stripped).toBe(false);
    expect("quests" in stripped).toBe(false);
  });
});
