import { Arrow } from "@/entities/projectiles/arrow";
import { Weapon } from "@/entities/weapons/weapon";
import { GunFiredEvent } from "../../../../game-shared/src/events/server-sent/events/gun-fired-event";
import { PlayerAttackedEvent } from "../../../../game-shared/src/events/server-sent/events/player-attacked-event";
import { Player } from "@/entities/players/player";
import { getJitteredFireAngleRadians } from "@/entities/weapons/weapon-accuracy";
export class Bow extends Weapon {
    constructor(gameManagers) {
        super(gameManagers, "bow");
    }
    getCooldown() {
        return this.getConfig().stats.cooldown;
    }
    attack(playerId, position, facing, aimAngle) {
        const player = this.getEntityManager().getEntityById(playerId);
        if (!player)
            return;
        const arrow = new Arrow(this.getGameManagers());
        arrow.setPosition(position);
        let fireAngle;
        if (player instanceof Player) {
            fireAngle = getJitteredFireAngleRadians(player, aimAngle, facing, 0.11);
        }
        else if (aimAngle !== undefined) {
            fireAngle = aimAngle;
        }
        if (fireAngle !== undefined) {
            arrow.setDirectionFromAngle(fireAngle);
        }
        else {
            arrow.setDirection(facing);
        }
        arrow.setShooterId(playerId);
        this.getEntityManager().addEntity(arrow);
        this.getEntityManager()
            .getBroadcaster()
            .broadcastEvent(new PlayerAttackedEvent({
            playerId,
            weaponKey: this.getType(),
        }));
        this.getEntityManager()
            .getBroadcaster()
            .broadcastEvent(new GunFiredEvent(playerId, this.getType()));
    }
}
