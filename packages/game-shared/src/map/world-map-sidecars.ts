/** Filenames for the world map bundle (tiles + NPC + quest sidecars). */
export const WORLD_MAP_MAIN_FILENAME = "world-map.json";
export const WORLD_MAP_NPCS_FILENAME = "world-map-npcs.json";
export const WORLD_MAP_QUESTS_FILENAME = "world-map-quests.json";

/**
 * `null` means the sidecar file was not read (e.g. ENOENT). Any other value means the file was read
 * and parsed JSON (invalid JSON should throw before calling merge).
 */
export type WorldMapSidecarParseResult = unknown | null;

export function extractDialogueNpcsFromSidecarJson(parsed: unknown): unknown | undefined {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === "object" && "dialogueNpcs" in parsed) {
    const v = (parsed as { dialogueNpcs?: unknown }).dialogueNpcs;
    return v;
  }
  return undefined;
}

export function extractQuestsFromSidecarJson(parsed: unknown): unknown | undefined {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === "object" && "quests" in parsed) {
    const v = (parsed as { quests?: unknown }).quests;
    return v;
  }
  return undefined;
}

export interface WorldMapMainWithOptionalSidecarFields {
  dialogueNpcs?: unknown;
  quests?: unknown;
}

/**
 * Sidecar wins when its file was read (`*_parsed !== null`). Missing file falls back to `main`.
 * When a sidecar file exists but has no recognizable array field, yields `[]`.
 */
export function mergeWorldMapMainWithSidecars(
  main: WorldMapMainWithOptionalSidecarFields,
  npcsParsed: WorldMapSidecarParseResult,
  questsParsed: WorldMapSidecarParseResult,
): { dialogueNpcs?: unknown; quests?: unknown } {
  let dialogueNpcs: unknown | undefined;
  if (npcsParsed !== null) {
    const extracted = extractDialogueNpcsFromSidecarJson(npcsParsed);
    dialogueNpcs = extracted !== undefined ? extracted : [];
  } else {
    dialogueNpcs = main.dialogueNpcs;
  }

  let quests: unknown | undefined;
  if (questsParsed !== null) {
    const extracted = extractQuestsFromSidecarJson(questsParsed);
    quests = extracted !== undefined ? extracted : [];
  } else {
    quests = main.quests;
  }

  return { dialogueNpcs, quests };
}

/** Payload for `world-map.json` only (omit NPC/quest arrays; they live in sidecars). */
export function stripWorldMapSidecarsForMainFile<T extends Record<string, unknown>>(
  data: T,
): Omit<T, "dialogueNpcs" | "quests"> {
  const { dialogueNpcs: _dn, quests: _q, ...rest } = data;
  return rest as Omit<T, "dialogueNpcs" | "quests">;
}
