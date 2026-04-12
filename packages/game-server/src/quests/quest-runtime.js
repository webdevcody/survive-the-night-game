import { DialogueSurvivorNpc } from "@/entities/environment/dialogue-survivor-npc";
import { distance } from "@shared/util/physics";
import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";
import { getConfig } from "@shared/config";
import Inventory from "@/extensions/inventory";
import { talkToNpcStepMatchesNpc } from "@shared/map/quest-types";
import { stringifyPlayerQuestState, parsePlayerQuestState, emptyPlayerQuestState, getActiveStepIndex, sanitizeActiveProgressAgainstQuestDefinition, activeQuestProgressEquals, } from "@shared/quests/player-quest-state";
import { dialogueNpcSessionsFromSerialized, pickDialogueNpcSession, } from "@shared/map/world-map-types";
import { queuePersistQuestProgressToWebsite } from "@/util/persist-quest-progress";
import { queuePersistExperienceDeltaToWebsite } from "@/util/persist-experience-delta";
import { UserSessionCache } from "@/services/user-session-cache";
function getState(player) {
    return parsePlayerQuestState(player.getSerialized().get("questStateJson"));
}
function setState(player, s) {
    player.getSerialized().set("questStateJson", stringifyPlayerQuestState(s));
    queuePersistQuestProgressToWebsite(player);
}
function setActiveStepIndex(st, qid, step) {
    st.active[qid] = { step };
}
function mapStatToSerializedKey(stat) {
    var _a;
    const m = {
        health: "statHealth",
        evade: "statEvade",
        accuracy: "statAccuracy",
        reloadSpeed: "statReloadSpeed",
        runSpeed: "statRunSpeed",
        luck: "statLuck",
        stamina: "statStamina",
        recovery: "statRecovery",
        hpRecovery: "statHpRecovery",
        strength: "statStrength",
    };
    return (_a = m[stat]) !== null && _a !== void 0 ? _a : null;
}
function applyRewardList(player, rewards) {
    var _a, _b;
    for (const r of rewards) {
        switch (r.type) {
            case "permanent_stat": {
                const key = mapStatToSerializedKey(r.stat);
                if (!key)
                    break;
                const cur = (_a = player.getSerialized().get(key)) !== null && _a !== void 0 ? _a : 0;
                player.getSerialized().set(key, Math.min(99, Math.floor(cur + r.amount)));
                break;
            }
            case "item": {
                const inv = player.getExt(Inventory);
                if (!inv.isFull()) {
                    inv.addItem({
                        itemType: r.itemType,
                        state: r.count > 1 ? { count: r.count } : undefined,
                    });
                }
                break;
            }
            case "experience": {
                const n = Math.floor(r.amount);
                if (n <= 0)
                    break;
                const cur = (_b = player.getSerialized().get("experience")) !== null && _b !== void 0 ? _b : 0;
                player.getSerialized().set("experience", cur + n);
                const socketId = player.getClientSocketId();
                if (!socketId)
                    break;
                const userId = UserSessionCache.getInstance().getUserIdBySocket(socketId);
                if (userId)
                    queuePersistExperienceDeltaToWebsite(userId, n);
                break;
            }
        }
    }
    player.applyDerivedStatsFromAllocations();
}
function applyRewards(player, def) {
    applyRewardList(player, def.rewards);
}
/** Removes one stack count per `pickup_item` step (items “turned in” when the quest completes). */
function consumePickupItemsForCompletedQuest(player, def) {
    if (!player.hasExt(Inventory))
        return;
    const inv = player.getExt(Inventory);
    for (const step of def.steps) {
        if (step.type !== "pickup_item")
            continue;
        inv.removeCountAcrossStacks(step.itemType, 1);
    }
}
function finishQuest(player, map, qid, st) {
    const def = map.getQuestDefinition(qid);
    delete st.active[qid];
    if (!st.completed.includes(qid))
        st.completed.push(qid);
    if (def) {
        consumePickupItemsForCompletedQuest(player, def);
        applyRewards(player, def);
    }
}
function getDialogueSessionsForNpcEntity(npc) {
    const raw = npc.getSerialized().get("dialogueSessions");
    const parsed = dialogueNpcSessionsFromSerialized(raw);
    if (parsed && parsed.length > 0)
        return parsed;
    const linesRaw = npc.getSerialized().get("dialogueLines");
    const lines = Array.isArray(linesRaw)
        ? linesRaw.map((l) => String(l))
        : ["…"];
    const grantRaw = npc.getSerialized().get("grantQuestId");
    const grantQuestId = grantRaw === null || grantRaw === undefined
        ? undefined
        : String(grantRaw).trim() || undefined;
    return [
        Object.assign({ when: { type: "always" }, lines }, (grantQuestId ? { grantQuestId } : {})),
    ];
}
function pickDialogueSessionForNpcEntity(npc, player, map) {
    var _a, _b;
    const sessions = getDialogueSessionsForNpcEntity(npc);
    const st = getState(player);
    const hasItemType = player.hasExt(Inventory)
        ? (itemType) => player.getExt(Inventory).hasItem(itemType)
        : () => false;
    const npcDisplayName = String((_a = npc.getSerialized().get("displayName")) !== null && _a !== void 0 ? _a : "");
    const npcKey = String((_b = npc.getSerialized().get("npcKey")) !== null && _b !== void 0 ? _b : "");
    return pickDialogueNpcSession(sessions, st, hasItemType, {
        getQuestStepCount: (qid) => { var _a; return (_a = map.getQuestDefinition(qid)) === null || _a === void 0 ? void 0 : _a.steps.length; },
        getQuestDefinition: (qid) => map.getQuestDefinition(qid),
        dialogueNpc: { displayName: npcDisplayName, npcKey },
    });
}
/**
 * Advances past consecutive `pickup_item` steps when the player already holds the item
 * (e.g. quest granted while the item was already in inventory).
 */
function syncActiveQuestPickupStepsWithInventory(player, map, st) {
    const hasItemType = player.hasExt(Inventory)
        ? (itemType) => player.getExt(Inventory).hasItem(itemType)
        : () => false;
    let changed = false;
    for (const qid of Object.keys(st.active)) {
        const def = map.getQuestDefinition(qid);
        if (!def)
            continue;
        let guard = 0;
        while (guard++ <= def.steps.length) {
            const idx = getActiveStepIndex(st, qid);
            if (idx >= def.steps.length)
                break;
            const step = def.steps[idx];
            if (!step || step.type !== "pickup_item")
                break;
            if (!hasItemType(step.itemType))
                break;
            setActiveStepIndex(st, qid, idx + 1);
            changed = true;
        }
    }
    return changed;
}
/**
 * Call at the **start** of processing a finished NPC dialogue (before grant/complete).
 * Catches up `pickup_item` progress when the player already holds the item, without
 * running in the same turn as {@link tryGrantQuestFromNpc} (which would let {@link tryCompleteQuestFromDialogue} finish the quest in one interaction).
 */
export function trySyncActiveQuestPickupStepsWithInventory(player, map) {
    const st = getState(player);
    if (syncActiveQuestPickupStepsWithInventory(player, map, st)) {
        setState(player, st);
    }
}
/** @returns The quest id that was newly activated, or null if nothing was granted. */
export function tryGrantQuestFromNpc(player, npc, map, acceptQuest = true) {
    var _a;
    if (!acceptQuest)
        return null;
    const st = getState(player);
    const session = pickDialogueSessionForNpcEntity(npc, player, map);
    const grant = String((_a = session.grantQuestId) !== null && _a !== void 0 ? _a : "").trim();
    if (!grant)
        return null;
    const def = map.getQuestDefinition(grant);
    if (!def)
        return null;
    if (st.completed.includes(grant) || st.active[grant] !== undefined)
        return null;
    setActiveStepIndex(st, grant, 0);
    applyRewardList(player, def.startRewards);
    setState(player, st);
    return grant;
}
export function tryCompleteQuestFromDialogue(player, npc, map) {
    var _a;
    const st = getState(player);
    const session = pickDialogueSessionForNpcEntity(npc, player, map);
    const complete = String((_a = session.completeQuestId) !== null && _a !== void 0 ? _a : "").trim();
    if (!complete)
        return;
    const def = map.getQuestDefinition(complete);
    if (!def)
        return;
    const progress = getActiveStepIndex(st, complete);
    if (def.steps.length > 0 && progress < def.steps.length)
        return;
    finishQuest(player, map, complete, st);
    setState(player, st);
}
/**
 * Advances active quests whose current step is `talk_to_npc` matching this NPC (after dialogue ends).
 * `skipQuestIds`: quest ids that were **just granted** this same completion; do not advance those yet,
 * so the "talk to NPC" objective is not auto-cleared by the same interaction that granted the quest.
 */
export function tryAdvanceTalkToNpcStep(player, npc, map, opts) {
    var _a, _b, _c;
    const npcDisplayName = String((_a = npc.getSerialized().get("displayName")) !== null && _a !== void 0 ? _a : "");
    const npcKey = String((_b = npc.getSerialized().get("npcKey")) !== null && _b !== void 0 ? _b : "");
    const st = getState(player);
    const qids = Object.keys(st.active);
    let changed = false;
    for (const qid of qids) {
        if ((_c = opts === null || opts === void 0 ? void 0 : opts.skipQuestIds) === null || _c === void 0 ? void 0 : _c.has(qid))
            continue;
        const def = map.getQuestDefinition(qid);
        if (!def)
            continue;
        const idx = getActiveStepIndex(st, qid);
        const step = def.steps[idx];
        if (!step || step.type !== "talk_to_npc")
            continue;
        if (!talkToNpcStepMatchesNpc(step, npcDisplayName, npcKey))
            continue;
        setActiveStepIndex(st, qid, idx + 1);
        changed = true;
    }
    if (changed)
        setState(player, st);
}
export function tryHealPlayerFromDialogueSession(player, npc, map) {
    var _a;
    if (player.isDead())
        return;
    const session = pickDialogueSessionForNpcEntity(npc, player, map);
    if (session.healOnDialogueComplete !== true)
        return;
    const d = player.getExt(Destructible);
    d.setHealth(d.getMaxHealth());
    const maxSt = (_a = player.getSerialized().get("maxStamina")) !== null && _a !== void 0 ? _a : getConfig().player.MAX_STAMINA;
    player.getSerialized().set("stamina", maxSt);
}
export function advancePickupStep(player, itemType, map) {
    const st = getState(player);
    const qids = Object.keys(st.active);
    let changed = false;
    for (const qid of qids) {
        const def = map.getQuestDefinition(qid);
        if (!def)
            continue;
        const idx = getActiveStepIndex(st, qid);
        const step = def.steps[idx];
        if (!step || step.type !== "pickup_item" || step.itemType !== itemType)
            continue;
        setActiveStepIndex(st, qid, idx + 1);
        changed = true;
    }
    if (changed)
        setState(player, st);
}
export function recordKillQuestProgress(player, enemyType, map) {
    var _a, _b, _c;
    const st = getState(player);
    const qids = Object.keys(st.active);
    let changed = false;
    for (const qid of qids) {
        const def = map.getQuestDefinition(qid);
        if (!def)
            continue;
        const idx = getActiveStepIndex(st, qid);
        const step = def.steps[idx];
        if (!step || step.type !== "kill_enemies")
            continue;
        if (step.enemyType !== enemyType)
            continue;
        const need = Math.floor(Number(step.count));
        if (!Number.isFinite(need) || need < 1)
            continue;
        const entry = st.active[qid];
        const prev = (_b = (_a = entry.kills) === null || _a === void 0 ? void 0 : _a[enemyType]) !== null && _b !== void 0 ? _b : 0;
        const next = prev + 1;
        if (next >= need) {
            setActiveStepIndex(st, qid, idx + 1);
        }
        else {
            st.active[qid] = {
                step: idx,
                kills: Object.assign(Object.assign({}, ((_c = entry.kills) !== null && _c !== void 0 ? _c : {})), { [enemyType]: next }),
            };
        }
        changed = true;
    }
    if (changed)
        setState(player, st);
}
export function tickWaypointSteps(player, map) {
    var _a;
    if (!player.hasExt(Positionable))
        return;
    const pos = player.getExt(Positionable).getCenterPosition();
    const TILE = getConfig().world.TILE_SIZE;
    const tx = Math.floor(pos.x / TILE);
    const ty = Math.floor(pos.y / TILE);
    const st = getState(player);
    const qids = Object.keys(st.active);
    let changed = false;
    for (const qid of qids) {
        const def = map.getQuestDefinition(qid);
        if (!def)
            continue;
        const idx = getActiveStepIndex(st, qid);
        const step = def.steps[idx];
        if (!step || step.type !== "reach_waypoint")
            continue;
        const radius = (_a = step.radiusTiles) !== null && _a !== void 0 ? _a : 2;
        const distTiles = Math.max(Math.abs(tx - step.col), Math.abs(ty - step.row));
        if (distTiles > radius)
            continue;
        setActiveStepIndex(st, qid, idx + 1);
        changed = true;
    }
    if (changed)
        setState(player, st);
}
export function validateDialogueComplete(player, em, npcEntityId) {
    const ent = em.getEntityById(npcEntityId);
    if (!(ent instanceof DialogueSurvivorNpc))
        return null;
    if (!player.hasExt(Positionable) || !ent.hasExt(Positionable))
        return null;
    const d = distance(player.getExt(Positionable).getCenterPosition(), ent.getExt(Positionable).getCenterPosition());
    if (d > getConfig().player.MAX_INTERACT_RADIUS)
        return null;
    return ent;
}
export function initPlayerQuestState(player, payload) {
    player.getSerialized().set("questStateJson", stringifyPlayerQuestState(payload !== null && payload !== void 0 ? payload : emptyPlayerQuestState()));
}
/**
 * After a map reload (/restart or editor reload), drop quest progress that no longer exists on the map
 * so clients receive definitions and journal state that match {@link IMapManager#getMapData}.
 */
export function reconcilePlayerQuestStateWithMap(player, map) {
    const st = getState(player);
    let changed = false;
    for (const qid of Object.keys(st.active)) {
        if (!map.getQuestDefinition(qid)) {
            delete st.active[qid];
            changed = true;
        }
    }
    const catalog = map.getMapData().quests;
    const hasQuestCatalog = Array.isArray(catalog) && catalog.length > 0;
    if (hasQuestCatalog) {
        const filteredCompleted = st.completed.filter((qid) => map.getQuestDefinition(qid));
        if (filteredCompleted.length !== st.completed.length) {
            st.completed = filteredCompleted;
            changed = true;
        }
    }
    for (const qid of Object.keys(st.active)) {
        const def = map.getQuestDefinition(qid);
        if (!def)
            continue;
        const prev = st.active[qid];
        const next = sanitizeActiveProgressAgainstQuestDefinition(prev, def);
        if (!activeQuestProgressEquals(prev, next)) {
            st.active[qid] = next;
            changed = true;
        }
    }
    if (syncActiveQuestPickupStepsWithInventory(player, map, st)) {
        changed = true;
    }
    if (changed) {
        setState(player, st);
    }
}
