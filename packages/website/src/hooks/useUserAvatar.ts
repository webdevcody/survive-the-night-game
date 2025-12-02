import { authClient } from "~/lib/auth-client";
import { useAvatarImage } from "./useAvatarImage";

export function useUserAvatar() {
  const { data: session } = authClient.useSession();
  return useAvatarImage(session?.user?.image || null);
}
