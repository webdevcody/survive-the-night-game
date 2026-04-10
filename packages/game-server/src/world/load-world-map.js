import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getConfig } from "@shared/config";
import { mergeWorldMapMainWithSidecars, WORLD_MAP_NPCS_FILENAME, WORLD_MAP_QUESTS_FILENAME, } from "@shared/map/world-map-sidecars";
function resolveWorldMapJsonPath() {
    // Resolve next to this module first so reloads always hit the package's world-map.json
    // regardless of process.cwd() (monorepo / IDE / alternate entrypoints).
    let adjacentToModule = null;
    try {
        adjacentToModule = path.join(path.dirname(fileURLToPath(import.meta.url)), "world-map.json");
    }
    catch (_a) {
        /* ignore */
    }
    if (adjacentToModule && fs.existsSync(adjacentToModule)) {
        return adjacentToModule;
    }
    const cwd = process.cwd();
    const srcPath = path.join(cwd, "src", "world", "world-map.json");
    const distPath = path.join(cwd, "dist", "world-map.json");
    // Prefer src: the map editor writes here; dist is only updated on build and would stay stale.
    if (fs.existsSync(srcPath)) {
        return srcPath;
    }
    if (fs.existsSync(distPath)) {
        return distPath;
    }
    return adjacentToModule !== null && adjacentToModule !== void 0 ? adjacentToModule : srcPath;
}
function tryReadWorldMapSidecarSync(filePath) {
    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw);
    }
    catch (e) {
        const err = e;
        if (err.code === "ENOENT") {
            return null;
        }
        throw e;
    }
}
export function tryLoadWorldMapFile() {
    const filePath = resolveWorldMapJsonPath();
    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);
        const dir = path.dirname(filePath);
        const npcsParsed = tryReadWorldMapSidecarSync(path.join(dir, WORLD_MAP_NPCS_FILENAME));
        const questsParsed = tryReadWorldMapSidecarSync(path.join(dir, WORLD_MAP_QUESTS_FILENAME));
        const merged = mergeWorldMapMainWithSidecars(data, npcsParsed, questsParsed);
        return Object.assign(Object.assign({}, data), { dialogueNpcs: merged.dialogueNpcs, quests: merged.quests });
    }
    catch (e) {
        const err = e;
        if (err.code === "ENOENT") {
            return null;
        }
        throw e;
    }
}
export function validateWorldMapDimensions(data) {
    var _a, _b, _c, _d;
    const n = getConfig().world.BIOME_SIZE * getConfig().world.MAP_SIZE;
    if (!data.ground || !data.collidables) {
        return false;
    }
    if (data.ground.length !== n || data.collidables.length !== n) {
        return false;
    }
    for (let i = 0; i < n; i++) {
        if (((_a = data.ground[i]) === null || _a === void 0 ? void 0 : _a.length) !== n || ((_b = data.collidables[i]) === null || _b === void 0 ? void 0 : _b.length) !== n) {
            return false;
        }
    }
    if (data.spawns !== undefined) {
        if (data.spawns.length !== n) {
            return false;
        }
        for (let i = 0; i < n; i++) {
            if (((_c = data.spawns[i]) === null || _c === void 0 ? void 0 : _c.length) !== n) {
                return false;
            }
        }
    }
    if (data.decals !== undefined) {
        if (data.decals.length !== n) {
            return false;
        }
        for (let i = 0; i < n; i++) {
            if (((_d = data.decals[i]) === null || _d === void 0 ? void 0 : _d.length) !== n) {
                return false;
            }
        }
    }
    return true;
}
