import { describe, it, expect, beforeEach, Mock } from "vitest";
import { WeaponClient } from "../../src/entities/weapons/weapon";
import { PlayerClient } from "../../src/entities/player";
import { RawEntity } from "@survive-the-night/game-shared";
import { GameState } from "@/state";
import { ExtensionTypes } from "@survive-the-night/game-server/src/shared/extension-types";
import { createMockCtx } from "../mocks/ctx";
import { createMockImageLoader } from "../mocks/image-loader";

describe("Weapon", () => {
  let weapon: WeaponClient;

  beforeEach(() => {
    weapon = new WeaponClient(
      {
        id: "1",
        type: "weapon",
        weaponType: "pistol",
        extensions: [
          {
            type: ExtensionTypes.INTERACTIVE,
            interact: true,
            displayName: "pistol",
          },
          {
            type: ExtensionTypes.POSITIONABLE,
            size: 16,
            x: 0,
            y: 0,
          },
        ],
      },
      createMockImageLoader()
    );
  });

  it("should render text when a player is within range of a weapon", () => {
    const mockCtx = createMockCtx();

    const playerEntityRaw: RawEntity = {
      id: "1",
      type: "player",
      extensions: [
        {
          type: ExtensionTypes.POSITIONABLE,
          x: 0,
          y: 0,
          size: 16,
        },
      ],
    };

    const player = new PlayerClient(playerEntityRaw, {} as any);

    weapon.render(mockCtx, {
      entities: [player],
      playerId: "1",
      untilNextCycle: 0,
      isDay: true,
      crafting: false,
      startedAt: 0,
      dayNumber: 1,
    } as GameState);

    expect((mockCtx.fillText as Mock).mock.calls[0][0]).toBe("pistol (e)");
  });
});
