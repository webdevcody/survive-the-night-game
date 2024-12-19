import { EntityManager } from "../../managers/entity-manager";
import { Entity, Entities, RawEntity } from "../entities";
import { Positionable } from "../extensions";
import { Expirable } from "../extensions";
import { Vector2 } from "../physics";

// these values must match the sound files in the client
export const SOUND_TYPES = {
  PISTOL: "pistol",
  SHOTGUN: "shotgun",
  PLAYER_HURT: "player_hurt",
  PICK_UP_ITEM: "pick_up_item",
  DROP_ITEM: "drop_item",
  PLAYER_DEATH: "player_death",
  ZOMBIE_DEATH: "zombie_death",
  ZOMBIE_HURT: "zombie_hurt",
  SHOTGUN_FIRE: "shotgun_fire",
} as const;

export type SoundType = (typeof SOUND_TYPES)[keyof typeof SOUND_TYPES];

export class Sound extends Entity {
  private soundType: SoundType;

  constructor(entityManager: EntityManager, soundType: SoundType) {
    super(entityManager, Entities.SOUND);
    this.soundType = soundType;
    this.extensions = [new Positionable(this), new Expirable(this, entityManager, 5000)];
  }

  public serialize(): RawEntity {
    return {
      ...super.serialize(),
      soundType: this.soundType,
    };
  }
}

export const createSoundAtPosition = (
  entityManager: EntityManager,
  soundType: SoundType,
  position: Vector2
) => {
  const sound = new Sound(entityManager, soundType);
  sound.getExt(Positionable).setPosition(position);
  entityManager.addEntity(sound);
  return sound;
};
