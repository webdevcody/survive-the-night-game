import { GenericEntity } from "../entities";
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";
import { Cooldown } from "../entities/util/cooldown";
import { EntityManager } from "@/managers/entity-manager";

// an extension which will automatically remove the entity after a certain amount of time.
export default class Expirable implements Extension {
  public static readonly Name = ExtensionNames.expirable;

  private self: GenericEntity;
  private entityManager: EntityManager;
  private expireCooldown: Cooldown;

  public constructor(self: GenericEntity, entityManager: EntityManager, expiresIn: number) {
    this.self = self;
    this.entityManager = entityManager;
    this.expireCooldown = new Cooldown(expiresIn);
  }

  public update(deltaTime: number) {
    this.expireCooldown.update(deltaTime);

    if (this.expireCooldown.isReady()) {
      this.entityManager.markEntityForRemoval(this.self);
    }
  }

  public deserialize(data: ExtensionSerialized) {
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      name: Expirable.Name,
    };
  }
}
