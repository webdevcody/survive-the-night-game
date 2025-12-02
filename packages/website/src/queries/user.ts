import { queryOptions } from "@tanstack/react-query";
import { getImageUrlFn } from "~/fn/storage";

export const getUserAvatarQuery = (imageKey: string | null) =>
  queryOptions({
    queryKey: ["avatar-url", imageKey],
    queryFn: async (): Promise<{ imageUrl: string | null }> => {
      if (!imageKey) {
        return { imageUrl: null };
      }
      
      try {
        const result = await getImageUrlFn({
          data: { imageKey },
        });
        return { imageUrl: result.imageUrl };
      } catch (error) {
        console.error('Error fetching avatar URL:', error);
        return { imageUrl: null };
      }
    },
    enabled: !!imageKey,
    retry: false, // Don't retry on failure
    staleTime: 5 * 60 * 1000, // 5 minutes
  });