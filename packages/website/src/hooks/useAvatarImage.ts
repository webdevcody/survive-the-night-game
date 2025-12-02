import { useState, useEffect } from "react";

export function useAvatarImage(imageUrl: string | null) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(imageUrl);

  useEffect(() => {
    setAvatarUrl(imageUrl);
  }, [imageUrl]);

  return { avatarUrl };
}

