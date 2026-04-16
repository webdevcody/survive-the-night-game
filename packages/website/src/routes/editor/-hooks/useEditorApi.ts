import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "../-config/api";
import type {
  WorldMapDialogueNpcEditorMetadata,
  WorldMapDialogueNpcEntry,
  WorldMapMerchantEntry,
  WorldMapMessageDecalEntry,
  WorldMapScavengeDecalEntry,
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
  scavengeDecals?: WorldMapScavengeDecalEntry[];
  quests?: WorldMapQuestDefinition[];
  spawnerMeta?: WorldMapSpawnerMetaEntry[];
  merchantMeta?: WorldMapMerchantEntry[];
  dialogueNpcEditorMetadata?: WorldMapDialogueNpcEditorMetadata[];
}

export interface GameServerReloadInfo {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
}

export interface WorldMapBundleSavedPaths {
  main: string;
  npcs: string;
  quests: string;
}

export interface SaveWorldMapResponse {
  success?: boolean;
  message?: string;
  /** Absolute paths on disk (biome-editor-server); confirm the editor API wrote the bundle. */
  savedPaths?: WorldMapBundleSavedPaths;
  gameServerReload?: GameServerReloadInfo;
}

// Query Keys
export const editorQueryKeys = {
  worldMap: ["worldMap"] as const,
};

export function useWorldMap() {
  return useQuery({
    queryKey: editorQueryKeys.worldMap,
    /** Cuts down refetch noise (GET /api/world-map) in dev; save still invalidates. */
    staleTime: 30_000,
    refetchOnWindowFocus: false,
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
      scavengeDecals,
      quests,
      spawnerMeta,
      merchantMeta,
    }: {
      ground: number[][];
      collidables: number[][];
      spawns: number[][];
      decals: number[][];
      dialogueNpcs: WorldMapDialogueNpcEntry[];
      messageDecals: WorldMapMessageDecalEntry[];
      scavengeDecals: WorldMapScavengeDecalEntry[];
      quests: WorldMapQuestDefinition[];
      spawnerMeta: WorldMapSpawnerMetaEntry[];
      merchantMeta: WorldMapMerchantEntry[];
    }): Promise<SaveWorldMapResponse> => {
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
          scavengeDecals,
          quests,
          spawnerMeta,
          merchantMeta,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(
          typeof errBody.error === "string" ? errBody.error : "Failed to save world map",
        );
      }

      const data = (await response.json()) as SaveWorldMapResponse;
      if (import.meta.env.DEV) {
        console.info("[editor] save map → savedPaths:", data.savedPaths);
        console.info("[editor] save map → gameServerReload:", data.gameServerReload);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: editorQueryKeys.worldMap,
      });
    },
  });
}
