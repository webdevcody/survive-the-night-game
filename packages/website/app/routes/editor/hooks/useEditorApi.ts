import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "../../../config/api";
import type { BiomeInfo } from "../types";

// API Response Types
interface BiomesListResponse {
  biomes: BiomeInfo[];
}

interface BiomeDataResponse {
  ground: number[][];
  collidables: number[][];
  items?: string[];
}

// Query Keys
export const editorQueryKeys = {
  biomes: ["biomes"] as const,
  biome: (name: string) => ["biome", name] as const,
};

// Hooks

export function useBiomes() {
  return useQuery({
    queryKey: editorQueryKeys.biomes,
    queryFn: async (): Promise<BiomeInfo[]> => {
      const response = await fetch(API_ENDPOINTS.biomes());
      if (!response.ok) {
        throw new Error("Failed to fetch biomes");
      }
      const data: BiomesListResponse = await response.json();
      return data.biomes;
    },
  });
}

export function useBiome(biomeName: string | null) {
  return useQuery({
    queryKey: editorQueryKeys.biome(biomeName ?? ""),
    queryFn: async (): Promise<BiomeDataResponse> => {
      if (!biomeName) throw new Error("No biome name provided");

      const response = await fetch(API_ENDPOINTS.biome(biomeName));
      if (!response.ok) {
        throw new Error(`Failed to load biome ${biomeName}`);
      }
      return response.json();
    },
    enabled: !!biomeName,
  });
}

export function useSaveBiome() {
  const queryClient = useQueryClient();

  return useMutation({
      mutationFn: async ({
        biomeName,
        ground,
        collidables,
        items,
      }: {
        biomeName: string;
        ground: number[][];
        collidables: number[][];
        items: string[];
      }) => {
        const response = await fetch(API_ENDPOINTS.biome(biomeName), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ground,
            collidables,
            items,
          }),
        });

      if (!response.ok) {
        throw new Error(`Failed to save biome ${biomeName}`);
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate the biome query to refetch the updated data
      queryClient.invalidateQueries({
        queryKey: editorQueryKeys.biome(variables.biomeName),
      });
    },
  });
}

export function useCreateBiome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const response = await fetch(API_ENDPOINTS.biomes(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create biome");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate biomes list to refetch
      queryClient.invalidateQueries({
        queryKey: editorQueryKeys.biomes,
      });
    },
  });
}
