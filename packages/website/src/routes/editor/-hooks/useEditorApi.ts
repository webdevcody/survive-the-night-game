import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "../-config/api";
import type {
  WorldMapDialogueNpcEntry,
  WorldMapMessageDecalEntry,
  WorldMapSpawnerMetaEntry,
} from "@survive-the-night/game-shared/map/world-map-types";
import type { WorldMapQuestDefinition } from "@survive-the-night/game-shared/map/quest-types";

// API Response Types
interface WorldMapDataResponse {
  ground: number[][];
  collidables: number[][];
  spawns: number[][];
  decals: number[][];
  dialogueNpcs?: WorldMapDialogueNpcEntry[];
  messageDecals?: WorldMapMessageDecalEntry[];
  quests?: WorldMapQuestDefinition[];
  spawnerMeta?: WorldMapSpawnerMetaEntry[];
}

// Query Keys
export const editorQueryKeys = {
  worldMap: ["worldMap"] as const,
};

export function useWorldMap() {
  return useQuery({
    queryKey: editorQueryKeys.worldMap,
    queryFn: async (): Promise<WorldMapDataResponse> => {
      const response = await fetch(API_ENDPOINTS.worldMap());
      if (!response.ok) {
        throw new Error("Failed to fetch world map");
      }
      return response.json();
    },
  });
}

export interface ExpandWorldMapResponse {
  mapSizeBiomes: number;
  tileSize: number;
}

export function useExpandWorldMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mapSizeBiomes,
    }: {
      mapSizeBiomes: number;
    }): Promise<ExpandWorldMapResponse> => {
      const response = await fetch(API_ENDPOINTS.worldMapExpand(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mapSizeBiomes }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(
          typeof errBody.error === "string" ? errBody.error : "Failed to expand world map",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: editorQueryKeys.worldMap,
      });
    },
  });
}

export function useSaveWorldMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ground,
      collidables,
      spawns,
      decals,
      dialogueNpcs,
      messageDecals,
      quests,
      spawnerMeta,
    }: {
      ground: number[][];
      collidables: number[][];
      spawns: number[][];
      decals: number[][];
      dialogueNpcs: WorldMapDialogueNpcEntry[];
      messageDecals: WorldMapMessageDecalEntry[];
      quests: WorldMapQuestDefinition[];
      spawnerMeta: WorldMapSpawnerMetaEntry[];
    }) => {
      const response = await fetch(API_ENDPOINTS.worldMap(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ground,
          collidables,
          spawns,
          decals,
          dialogueNpcs,
          messageDecals,
          quests,
          spawnerMeta,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(
          typeof errBody.error === "string" ? errBody.error : "Failed to save world map",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: editorQueryKeys.worldMap,
      });
    },
  });
}
