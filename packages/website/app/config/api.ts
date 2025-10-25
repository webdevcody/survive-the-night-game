const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export const API_ENDPOINTS = {
  biomes: () => `${API_BASE_URL}/api/biomes`,
  biome: (name: string) => `${API_BASE_URL}/api/biomes/${name}`,
} as const;
