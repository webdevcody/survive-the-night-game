import Illuminated from "@/extensions/illuminated";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { getConfig } from "@shared/config";
import { Entity } from "@/entities/entity";
import { Player } from "@/entities/players/player";
import { sendPlayerHudMessage } from "@/util/send-player-hud-message";
import Vector2 from "@/util/vector2";
import PoolManager from "@/util/pool-manager";

const CAMPSITE_ALREADY_BOUND_MESSAGE = "mhh so warm...";

export class CampsiteFire extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.CAMPSITE_FIRE);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("set respawn"),
    );
    this.addExtension(new Illuminated(this, getConfig().world.LIGHT_RADIUS_FIRE));
  }

  private interact(playerEntityId: number): void {
    const entity = this.getEntityManager().getEntityById(playerEntityId);
    if (!entity || !(entity instanceof Player)) {
      return;
    }
    const pos = this.getExt(Positionable).getPosition();
    const tileSize = getConfig().world.TILE_SIZE;
    const tx = Math.floor(pos.x / tileSize);
    const ty = Math.floor(pos.y / tileSize);
    const existing = entity.getBoundRespawnTile();
    if (existing && existing.x === tx && existing.y === ty) {
      sendPlayerHudMessage(this.getGameManagers(), entity.getId(), CAMPSITE_ALREADY_BOUND_MESSAGE);
      return;
    }
    entity.setBoundRespawnTile(tx, ty);
  }
}
