import { Bullet } from "@/entities/projectiles/bullet";
import { Weapon } from "@/entities/weapons/weapon";
import { PlayerAttackedEvent } from "../../../../game-shared/src/events/server-sent/events/player-attacked-event";
import { Player } from "@/entities/players/player";
import { getJitteredFireAngleRadians } from "@/entities/weapons/weapon-accuracy";
export class BoltActionRifle extends Weapon {
    constructor(gameManagers) {
        super(gameManagers, "bolt_action_rifle");
    }
    getCooldown() {
        return this.getConfig().stats.cooldown;
    }
    attack(playerId, position, facing, aimAngle) {
        const player = this.getEntityManager().getEntityById(playerId);
        if (!player)
            return;
        const bullet = new Bullet(this.getGameManagers(), 3);
        bullet.setPosition(position);
        let fireAngle;
        if (player instanceof Player) {
            fireAngle = getJitteredFireAngleRadians(player, aimAngle, facing, 0.1);
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
    }
}
