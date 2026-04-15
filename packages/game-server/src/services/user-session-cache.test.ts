import { describe, expect, it } from "vitest";
import { UserSessionCache } from "./user-session-cache";

describe("UserSessionCache", () => {
  it("replaces an older socket mapping for the same user", () => {
    const cache = new UserSessionCache();

    cache.setUserSession("socket-1", "user-1", "token-1", { gameSessionId: "lease-1" });
    cache.setUserSession("socket-2", "user-1", "token-2", { gameSessionId: "lease-2" });

    expect(cache.getSocketIdByUser("user-1")).toBe("socket-2");
    expect(cache.getUserIdBySocket("socket-1")).toBeNull();
    expect(cache.getTokenBySocket("socket-1")).toBeNull();
    expect(cache.getGameSessionLeaseBySocket("socket-1")).toBeNull();
    expect(cache.getUserIdBySocket("socket-2")).toBe("user-1");
    expect(cache.getTokenBySocket("socket-2")).toBe("token-2");
    expect(cache.getGameSessionLeaseBySocket("socket-2")).toEqual({ gameSessionId: "lease-2" });
  });

  it("does not clear the newer reverse mapping when the old socket is removed", () => {
    const cache = new UserSessionCache();

    cache.setUserSession("socket-1", "user-1", "token-1", { gameSessionId: "lease-1" });
    cache.setUserSession("socket-2", "user-1", "token-2", { gameSessionId: "lease-2" });

    cache.removeSocket("socket-1");

    expect(cache.getSocketIdByUser("user-1")).toBe("socket-2");
    expect(cache.getUserIdBySocket("socket-2")).toBe("user-1");
  });
});
