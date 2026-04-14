import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientEventListener } from "./client-event-listener";
import { GameState } from "@/state";

class FakeSocketManager {
  public requestPlayerId = vi.fn();
  public sendRequestFullState = vi.fn();
  public on = vi.fn();
  public onSocketDisconnect = vi.fn();
  public setReconnectResyncHandler = vi.fn();
}

describe("ClientEventListener initialization recovery", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("requests identity and full state if initial server push never arrives", () => {
    vi.useFakeTimers();

    const socketManager = new FakeSocketManager();
    const gameClient = {
      getGameState: () => new GameState(),
      start: vi.fn(),
    } as any;

    const listener = new ClientEventListener(gameClient, socketManager as any);
    listener.onTransportConnected();

    vi.advanceTimersByTime(3999);
    expect(socketManager.requestPlayerId).not.toHaveBeenCalled();
    expect(socketManager.sendRequestFullState).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(socketManager.requestPlayerId).toHaveBeenCalledTimes(1);
    expect(socketManager.sendRequestFullState).toHaveBeenCalledTimes(1);
  });
});
