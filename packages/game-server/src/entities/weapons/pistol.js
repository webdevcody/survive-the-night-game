import Inventory from "@/extensions/inventory";
import { Bullet } from "@/entities/projectiles/bullet";
import { Weapon } from "@/entities/weapons/weapon";
import { GunEmptyEvent } from "../../../../game-shared/src/events/server-sent/events/gun-empty-event";
import { GunFiredEvent } from "../../../../game-shared/src/events/server-sent/events/gun-fired-event";
import { PlayerAttackedEvent } from "../../../../game-shared/src/events/server-sent/events/player-attacked-event";
import { consumeAmmo } from "./helpers";
import { Player } from "@/entities/players/player";
import { getJitteredFireAngleRadians } from "@/entities/weapons/weapon-accuracy";
export class Pistol extends Weapon {
    constructor(gameManagers) {
        super(gameManagers, "pistol");
    }
    getCooldown() {
        return this.getConfig().stats.cooldown;
    }
    attack(playerId, position, facing, aimAngle) {
        const player = this.getEntityManager().getEntityById(playerId);
        if (!player)
            return;
        const inventory = player.getExt(Inventory);
        if (!consumeAmmo(inventory, "pistol_ammo")) {
            this.getEntityManager().getBroadcaster().broadcastEvent(new GunEmptyEvent(playerId));
            return;
        }
        const bullet = new Bullet(this.getGameManagers());
        bullet.setPosition(position);
        let fireAngle;
        if (player instanceof Player) {
            fireAngle = getJitteredFireAngleRadians(player, aimAngle, facing, 0.14);
        }
        else if (aimAngle !== undefined) {
            fireAngle = aimAngle;
        }
        if (fireAngle !== undefined) {
            bullet.setDirectionFromAngle(fireAngle);
        }
        else {
            bullet.setDirection(facing);
        }
        bullet.setShooterId(playerId);
        this.getEntityManager().addEntity(bullet);
        this.getEntityManager()
            .getBroadcaster()
            .broadcastEvent(new PlayerAttackedEvent({
            playerId,
            weaponKey: this.getType(),
        }));
        this.applyRecoil(player, facing, aimAngle, 0.35);
        this.getEntityManager().getBroadcaster().broadcastEvent(new GunFiredEvent(playerId, "pistol"));
    }
}
