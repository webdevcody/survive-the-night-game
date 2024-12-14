import { Entities, RawEntity } from "../entities";

import { EntityManager } from "@/managers/entity-manager";
import { Entity } from "../entities";
import { Positionable } from "../traits";
import { Vector2 } from "../physics";

export const SOUND_TYPES = {
  PISTOL: "pistol",
  SHOTGUN: "shotgun",
} as const;

export type SoundType = (typeof SOUND_TYPES)[keyof typeof SOUND_TYPES];

export class Sound extends Entity implements Positionable {
  private position: Vector2 = { x: 0, y: 0 };
  private soundType: SoundType;
  public constructor(entityManager: EntityManager, soundType: SoundType) {
    super(entityManager, Entities.SOUND);
    this.soundType = soundType;
  }

  public getPosition(): Vector2 {
    return this.position;
  }

  public setPosition(position: Vector2): void {
    this.position = position;
  }

  public getCenterPosition(): Vector2 {
    return this.position;
  }

  public serialize(): RawEntity {
    return {
      ...super.serialize(),
      soundType: this.soundType,
    };
  }
}
