import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import HoldInteract from "@/extensions/hold-interact";
import { Entities } from "@/constants";
import PoolManager from "@shared/util/pool-manager";
import { getConfig } from "@shared/config";
import { SerializableFields } from "@/util/serializable-fields";
import {
  DEFAULT_SCAVENGE_DECAL_DROP_MAX,
  DEFAULT_SCAVENGE_DECAL_DROP_MIN,
  DEFAULT_SCAVENGE_DECAL_RESPAWN_MS,
  DEFAULT_SCAVENGE_DECAL_SEARCH_MS,
  type WorldMapScavengeDecalEntry,
} from "@shared/map/world-map-types";
import {
  LEGACY_RANDOM_DROP_TABLE,
  rollZombieDropInventoryItem,
  type ZombieDropTableEntry,
} from "@shared/config/zombie-drop-tables";
import { Player } from "@/entities/players/player";
import { sendPlayerHudMessage } from "@/util/send-player-hud-message";
import { InteractableTexts } from "@shared/util/interactable-text-encoding";

export class ScavengeDecal extends Entity {
  private readonly dropTable: ZombieDropTableEntry[];
  private readonly respawnMs: number;
  private readonly dropCountMin: number;
  private readonly dropCountMax: number;

  constructor(
    gameManagers: IGameManagers,
    config: WorldMapScavengeDecalEntry,
    tileX: number,
    tileY: number,
  ) {
    super(gameManagers, Entities.SCAVENGE_DECAL);
    this.dropTable = config.dropTable?.length ? config.dropTable : LEGACY_RANDOM_DROP_TABLE;
    this.respawnMs = config.respawnMs ?? DEFAULT_SCAVENGE_DECAL_RESPAWN_MS;
    this.dropCountMin = config.dropCountMin ?? DEFAULT_SCAVENGE_DECAL_DROP_MIN;
    this.dropCountMax = config.dropCountMax ?? DEFAULT_SCAVENGE_DECAL_DROP_MAX;

    const searchMs = config.searchDurationMs ?? DEFAULT_SCAVENGE_DECAL_SEARCH_MS;

    this.serialized = new SerializableFields(
      {
        nextLootAt: 0,
      },
      () => this.markEntityDirty(),
      { nextLootAt: { numberType: "float64" } },
    );

    const poolManager = PoolManager.getInstance();
    const TILE_SIZE = getConfig().world.TILE_SIZE;
    const size = poolManager.vector2.claim(16, 16);
    const topLeft = poolManager.vector2.claim(tileX * TILE_SIZE, tileY * TILE_SIZE);

    this.addExtension(new Positionable(this).setSize(size).setPosition(topLeft));
    this.addExtension(new HoldInteract(this, searchMs));
    this.addExtension(
      new Interactive(this)
        .onInteract(this.onScavenge.bind(this))
        .setDisplayName(InteractableTexts.SCAVENGE),
    );
  }

  private rollDropCount(): number {
    const lo = Math.min(this.dropCountMin, this.dropCountMax);
    const hi = Math.max(this.dropCountMin, this.dropCountMax);
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }

  private onScavenge(entityId: number): void {
    const now = Date.now();
    if (now < this.serialized.get("nextLootAt")) {
      const player = this.getEntityManager().getEntityById(entityId);
      if (player instanceof Player) {
        sendPlayerHudMessage(
          this.getGameManagers(),
          player.getId(),
          "Nothing to scavenge here yet.",
          "#94a3b8",
        );
      }
      return;
    }

    const player = this.getEntityManager().getEntityById(entityId);
    if (player instanceof Player) {
      player.addProfessionXp("scavenging", 6);
    }

    const pos = this.getExt(Positionable).getPosition();
    const em = this.getEntityManager();
    const offsetRadius = 32;
    const n = this.rollDropCount();
    for (let i = 0; i < n; i++) {
      const item = rollZombieDropInventoryItem(this.dropTable);
      const spawned = em.createEntityFromItem(item);
      if (!spawned) continue;
      const theta = Math.random() * 2 * Math.PI;
      const r = Math.random() * offsetRadius;
      const poolManager = PoolManager.getInstance();
      const p = poolManager.vector2.claim(pos.x + r * Math.cos(theta), pos.y + r * Math.sin(theta));
      if (
        "setPosition" in spawned &&
        typeof (spawned as { setPosition: (v: unknown) => void }).setPosition === "function"
      ) {
        (spawned as { setPosition: (v: unknown) => void }).setPosition(p);
      } else if (spawned.hasExt(Positionable)) {
        spawned.getExt(Positionable).setPosition(p);
      }
      em.addEntity(spawned);
    }

    this.serialized.set("nextLootAt", now + this.respawnMs);
  }
}
