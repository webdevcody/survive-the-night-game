import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import type {
  QuestStep,
  QuestReward,
  WorldMapQuestDefinition,
} from "@survive-the-night/game-shared/map/quest-types";
import type { EntityType } from "@survive-the-night/game-shared/types/entity";
import { ITEM_FIXTURE_SPAWN_TYPES } from "@survive-the-night/game-shared/map/spawn-palette";
import { getMapSideLength } from "../-utils";

const STAT_OPTIONS = [
  "health",
  "evade",
  "accuracy",
  "reloadSpeed",
  "runSpeed",
  "luck",
  "stamina",
  "recovery",
  "hpRecovery",
  "strength",
] as const;

const PICKUP_TYPES = ITEM_FIXTURE_SPAWN_TYPES as readonly EntityType[];

type QuestRewardListKey = "rewards" | "startRewards";

const REWARD_SECTIONS: { key: QuestRewardListKey; label: string }[] = [
  { key: "startRewards", label: "Rewards on start" },
  { key: "rewards", label: "Rewards on complete" },
];

export function QuestsEditorPanel() {
  const quests = useEditorStore((state) => state.quests);
  const setQuests = useEditorStore((state) => state.setQuests);
  const groundGrid = useEditorStore((state) => state.groundGrid);

  const mapSide = getMapSideLength(groundGrid);

  const sortedQuests = useMemo(
    () =>
      [...quests].sort((a, b) => {
        const byTitle = a.title
          .trim()
          .localeCompare(b.title.trim(), undefined, { sensitivity: "base" });
        return byTitle !== 0 ? byTitle : a.id.localeCompare(b.id);
      }),
    [quests],
  );

  const addQuest = () => {
    const id = `quest_${Date.now()}`;
    setQuests([
      ...quests,
      { id, title: "New quest", steps: [], rewards: [], startRewards: [] },
    ]);
  };

  const updateQuest = (id: string, patch: Partial<Omit<WorldMapQuestDefinition, "id">>) => {
    setQuests(quests.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const removeQuest = (id: string) => {
    setQuests(quests.filter((q) => q.id !== id));
  };

  const updateStep = (questId: string, stepIndex: number, step: QuestStep) => {
    setQuests(
      quests.map((q) => {
        if (q.id !== questId) return q;
        const steps = q.steps.map((s, i) => (i === stepIndex ? step : s));
        return { ...q, steps };
      }),
    );
  };

  const removeStep = (questId: string, stepIndex: number) => {
    setQuests(
      quests.map((q) =>
        q.id === questId ? { ...q, steps: q.steps.filter((_, i) => i !== stepIndex) } : q,
      ),
    );
  };

  const addStep = (questId: string, type: QuestStep["type"]) => {
    const step: QuestStep =
      type === "pickup_item"
        ? { type: "pickup_item", itemType: "torch" as EntityType }
        : { type: "reach_waypoint", row: 0, col: 0, radiusTiles: 2 };
    setQuests(quests.map((q) => (q.id === questId ? { ...q, steps: [...q.steps, step] } : q)));
  };

  const updateReward = (
    questId: string,
    listKey: QuestRewardListKey,
    rewardIndex: number,
    reward: QuestReward,
  ) => {
    setQuests(
      quests.map((q) => {
        if (q.id !== questId) return q;
        const list = q[listKey].map((r, i) => (i === rewardIndex ? reward : r));
        return { ...q, [listKey]: list };
      }),
    );
  };

  const removeReward = (questId: string, listKey: QuestRewardListKey, rewardIndex: number) => {
    setQuests(
      quests.map((q) =>
        q.id === questId
          ? { ...q, [listKey]: q[listKey].filter((_, i) => i !== rewardIndex) }
          : q,
      ),
    );
  };

  const addReward = (questId: string, listKey: QuestRewardListKey, type: QuestReward["type"]) => {
    const reward: QuestReward =
      type === "permanent_stat"
        ? { type: "permanent_stat", stat: "health", amount: 1 }
        : { type: "item", itemType: "bandage" as EntityType, count: 1 };
    setQuests(
      quests.map((q) =>
        q.id === questId ? { ...q, [listKey]: [...q[listKey], reward] } : q,
      ),
    );
  };

  return (
    <div className="space-y-3 text-white">
      <div className="rounded border border-gray-600/80 bg-gray-950/50 px-2 py-2">
        <p className="text-[11px] font-medium text-gray-200">Quest definitions</p>
        <p className="mt-0.5 text-[10px] leading-snug text-gray-500">
          Saved with the world map when you use Save under Map file.
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-300">Quests</p>
        <Button size="sm" className="!h-7 !text-[10px]" onClick={addQuest} type="button">
          Add quest
        </Button>
      </div>
      {quests.length === 0 ? (
        <p className="text-[10px] text-gray-500">No quests yet. Add one for NPCs to grant.</p>
      ) : (
        <Accordion
          type="multiple"
          className="max-h-[70vh] overflow-y-auto rounded border border-indigo-800/80 bg-gray-900/80 pr-1"
        >
          {sortedQuests.map((q) => (
            <AccordionItem key={q.id} value={q.id} className="border-gray-700/60 px-2">
              <AccordionTrigger className="py-2.5 text-xs text-gray-100 hover:no-underline [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-gray-400">
                <span className="truncate pr-2 text-left font-medium">
                  {q.title.trim() || "Untitled quest"}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-3 pt-0 text-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-700/50 pb-2">
                  <p className="font-mono text-[10px] text-gray-400">
                    id: <span className="text-gray-200">{q.id}</span>
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="!h-6 !text-[10px]"
                    onClick={() => removeQuest(q.id)}
                  >
                    Delete
                  </Button>
                </div>
                <label className="text-[10px] text-gray-400">Title</label>
                <input
                  className="mb-2 w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[11px]"
                  value={q.title}
                  onChange={(e) => updateQuest(q.id, { title: e.target.value })}
                />
                <p className="mb-1 text-[10px] font-medium text-gray-300">Steps</p>
                <div className="mb-2 space-y-2">
                  {q.steps.map((s, i) => (
                    <div key={i} className="rounded border border-gray-700 bg-gray-950/80 p-1.5">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[9px] uppercase text-gray-500">Step {i + 1}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="!h-5 !min-h-0 !px-1 !text-[9px]"
                          onClick={() => removeStep(q.id, i)}
                        >
                          Remove
                        </Button>
                      </div>
                      {s.type === "pickup_item" ? (
                        <select
                          className="w-full rounded border border-gray-600 bg-gray-900 text-[10px]"
                          value={s.itemType}
                          onChange={(e) =>
                            updateStep(q.id, i, {
                              type: "pickup_item",
                              itemType: e.target.value as EntityType,
                            })
                          }
                        >
                          {PICKUP_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {s.type === "reach_waypoint" ? (
                        <div className="flex flex-wrap gap-1">
                          <input
                            type="number"
                            className="w-16 rounded border border-gray-600 bg-gray-900 text-[10px]"
                            min={0}
                            max={mapSide - 1}
                            value={s.row}
                            onChange={(e) =>
                              updateStep(q.id, i, {
                                ...s,
                                row: Math.max(
                                  0,
                                  Math.min(mapSide - 1, parseInt(e.target.value, 10) || 0),
                                ),
                              })
                            }
                          />
                          <input
                            type="number"
                            className="w-16 rounded border border-gray-600 bg-gray-900 text-[10px]"
                            min={0}
                            max={mapSide - 1}
                            value={s.col}
                            onChange={(e) =>
                              updateStep(q.id, i, {
                                ...s,
                                col: Math.max(
                                  0,
                                  Math.min(mapSide - 1, parseInt(e.target.value, 10) || 0),
                                ),
                              })
                            }
                          />
                          <input
                            type="number"
                            className="w-14 rounded border border-gray-600 bg-gray-900 text-[10px]"
                            title="radius tiles"
                            min={1}
                            max={8}
                            value={s.radiusTiles ?? 2}
                            onChange={(e) =>
                              updateStep(q.id, i, {
                                ...s,
                                radiusTiles: Math.max(
                                  1,
                                  Math.min(8, parseInt(e.target.value, 10) || 2),
                                ),
                              })
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="mb-2 flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="!h-6 !text-[9px]"
                    onClick={() => addStep(q.id, "pickup_item")}
                  >
                    + Pickup
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="!h-6 !text-[9px]"
                    onClick={() => addStep(q.id, "reach_waypoint")}
                  >
                    + Waypoint
                  </Button>
                </div>
                {REWARD_SECTIONS.map(({ key: listKey, label }) => (
                  <div key={listKey} className="space-y-1">
                    <p className="mb-1 text-[10px] font-medium text-gray-300">{label}</p>
                    <div className="space-y-2">
                      {q[listKey].map((r, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-center gap-1 rounded border border-gray-700 bg-gray-950/80 p-1"
                        >
                          {r.type === "permanent_stat" ? (
                            <>
                              <select
                                className="rounded border border-gray-600 bg-gray-900 text-[10px]"
                                value={r.stat}
                                onChange={(e) =>
                                  updateReward(q.id, listKey, i, {
                                    type: "permanent_stat",
                                    stat: e.target.value,
                                    amount: r.amount,
                                  })
                                }
                              >
                                {STAT_OPTIONS.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                className="w-12 rounded border border-gray-600 bg-gray-900 text-[10px]"
                                min={1}
                                max={99}
                                value={r.amount}
                                onChange={(e) =>
                                  updateReward(q.id, listKey, i, {
                                    type: "permanent_stat",
                                    stat: r.stat,
                                    amount: Math.max(
                                      1,
                                      Math.min(99, parseInt(e.target.value, 10) || 1),
                                    ),
                                  })
                                }
                              />
                            </>
                          ) : (
                            <>
                              <select
                                className="rounded border border-gray-600 bg-gray-900 text-[10px]"
                                value={r.itemType}
                                onChange={(e) =>
                                  updateReward(q.id, listKey, i, {
                                    type: "item",
                                    itemType: e.target.value as EntityType,
                                    count: r.count,
                                  })
                                }
                              >
                                {PICKUP_TYPES.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                className="w-10 rounded border border-gray-600 bg-gray-900 text-[10px]"
                                min={1}
                                max={99}
                                value={r.count}
                                onChange={(e) =>
                                  updateReward(q.id, listKey, i, {
                                    type: "item",
                                    itemType: r.itemType,
                                    count: Math.max(
                                      1,
                                      Math.min(99, parseInt(e.target.value, 10) || 1),
                                    ),
                                  })
                                }
                              />
                            </>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="!h-5 !px-1 !text-[9px]"
                            onClick={() => removeReward(q.id, listKey, i)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="!h-6 !text-[9px]"
                        onClick={() => addReward(q.id, listKey, "permanent_stat")}
                      >
                        + Stat
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="!h-6 !text-[9px]"
                        onClick={() => addReward(q.id, listKey, "item")}
                      >
                        + Item
                      </Button>
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
