import { DialogueSurvivorNpc } from "@/entities/environment/dialogue-survivor-npc";
import { distance } from "@shared/util/physics";
import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";
import { getConfig } from "@shared/config";
import Inventory from "@/extensions/inventory";
import { stringifyPlayerQuestState, parsePlayerQuestState, emptyPlayerQuestState, } from "@shared/quests/player-quest-state";
import { dialogueNpcSessionsFromSerialized, pickDialogueNpcSession, } from "@shared/map/world-map-types";
import { queuePersistQuestProgressToWebsite } from "@/util/persist-quest-progress";
function getState(player) {
    return parsePlayerQuestState(player.getSerialized().get("questStateJson"));
}
function setState(player, s) {
    player.getSerialized().set("questStateJson", stringifyPlayerQuestState(s));
    queuePersistQuestProgressToWebsite(player);
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
function applyRewards(player, def) {
    var _a;
    for (const r of def.rewards) {
        if (r.type === "permanent_stat") {
            const key = mapStatToSerializedKey(r.stat);
            if (!key)
                continue;
            const cur = (_a = player.getSerialized().get(key)) !== null && _a !== void 0 ? _a : 0;
            player.getSerialized().set(key, Math.min(99, Math.floor(cur + r.amount)));
        }
        else if (r.type === "item") {
            const inv = player.getExt(Inventory);
            if (!inv.isFull()) {
                inv.addItem({
                    itemType: r.itemType,
                    state: r.count > 1 ? { count: r.count } : undefined,
                });
            }
        }
    }
    player.applyDerivedStatsFromAllocations();
}
function finishQuest(player, map, qid, st) {
    const def = map.getQuestDefinition(qid);
    delete st.active[qid];
    if (!st.completed.includes(qid))
        st.completed.push(qid);
    if (def)
        applyRewards(player, def);
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
function pickDialogueSessionForNpcEntity(npc, st) {
    const sessions = getDialogueSessionsForNpcEntity(npc);
    return pickDialogueNpcSession(sessions, st);
}
export function tryGrantQuestFromNpc(player, npc, map) {
    var _a;
    const st = getState(player);
    const session = pickDialogueSessionForNpcEntity(npc, st);
    const grant = String((_a = session.grantQuestId) !== null && _a !== void 0 ? _a : "").trim();
    if (!grant)
        return;
    const def = map.getQuestDefinition(grant);
    if (!def)
        return;
    if (st.completed.includes(grant) || st.active[grant] !== undefined)
        return;
    st.active[grant] = 0;
    setState(player, st);
}
export function tryCompleteQuestFromDialogue(player, npc, map) {
    var _a;
    const st = getState(player);
    const session = pickDialogueSessionForNpcEntity(npc, st);
    const complete = String((_a = session.completeQuestId) !== null && _a !== void 0 ? _a : "").trim();
    if (!complete)
        return;
    const def = map.getQuestDefinition(complete);
    if (!def)
        return;
    finishQuest(player, map, complete, st);
    setState(player, st);
}
export function tryHealPlayerFromDialogueSession(player, npc) {
    var _a;
    if (player.isDead())
        return;
    const st = getState(player);
    const session = pickDialogueSessionForNpcEntity(npc, st);
    if (session.healOnDialogueComplete !== true)
        return;
    const d = player.getExt(Destructible);
    d.setHealth(d.getMaxHealth());
    const maxSt = (_a = player.getSerialized().get("maxStamina")) !== null && _a !== void 0 ? _a : getConfig().player.MAX_STAMINA;
    player.getSerialized().set("stamina", maxSt);
}
export function advancePickupStep(player, itemType, map) {
    var _a;
    const st = getState(player);
    const qids = Object.keys(st.active);
    let changed = false;
    for (const qid of qids) {
        const def = map.getQuestDefinition(qid);
        if (!def)
            continue;
        const idx = (_a = st.active[qid]) !== null && _a !== void 0 ? _a : 0;
        const step = def.steps[idx];
        if (!step || step.type !== "pickup_item" || step.itemType !== itemType)
            continue;
        const next = idx + 1;
        if (next >= def.steps.length) {
            finishQuest(player, map, qid, st);
        }
        else {
            st.active[qid] = next;
        }
        changed = true;
    }
    if (changed)
        setState(player, st);
}
export function tickWaypointSteps(player, map) {
    var _a, _b;
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
        const idx = (_a = st.active[qid]) !== null && _a !== void 0 ? _a : 0;
        const step = def.steps[idx];
        if (!step || step.type !== "reach_waypoint")
            continue;
        const radius = (_b = step.radiusTiles) !== null && _b !== void 0 ? _b : 2;
        const distTiles = Math.max(Math.abs(tx - step.col), Math.abs(ty - step.row));
        if (distTiles > radius)
            continue;
        const next = idx + 1;
        if (next >= def.steps.length) {
            finishQuest(player, map, qid, st);
        }
        else {
            st.active[qid] = next;
        }
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
