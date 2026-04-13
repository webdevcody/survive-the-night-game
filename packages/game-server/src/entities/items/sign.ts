import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import type { ItemState } from "@/types/entity";
import PoolManager from "@shared/util/pool-manager";
import { SerializableFields } from "@/util/serializable-fields";
import { coerceSignMessage } from "@shared/util/sign-message";

export class Sign extends Entity {
  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.SIGN);

    const message = coerceSignMessage(itemState?.message) ?? "";
    this.serialized = new SerializableFields(
      {
        message,
      },
      () => this.markEntityDirty(),
    );

    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(
      new Interactive(this)
        .onInteract((entityId) => {
          this.getExt(Carryable).pickup(entityId);
        })
        .setDisplayName("read"),
    );
    this.addExtension(new Carryable(this, "sign").setItemState(message ? { message } : {}));
  }
}
