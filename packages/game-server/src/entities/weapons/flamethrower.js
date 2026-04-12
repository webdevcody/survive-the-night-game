import { FlameProjectile } from "@/entities/projectiles/flame-projectile";
import { Weapon } from "@/entities/weapons/weapon";
import { PlayerAttackedEvent } from "../../../../game-shared/src/events/server-sent/events/player-attacked-event";
import { Player } from "@/entities/players/player";
import { getJitteredFireAngleRadians } from "@/entities/weapons/weapon-accuracy";
export class Flamethrower extends Weapon {
    constructor(gameManagers) {
        super(gameManagers, "flamethrower");
    }
    getCooldown() {
        return this.getConfig().stats.cooldown;
    }
    attack(playerId, position, facing, aimAngle) {
        const player = this.getEntityManager().getEntityById(playerId);
        if (!player)
            return;
        // Create flame projectile with damage
        const flame = new FlameProjectile(this.getGameManagers(), 1);
        flame.setPosition(position);
        let fireAngle;
        if (player instanceof Player) {
            fireAngle = getJitteredFireAngleRadians(player, aimAngle, facing, 0.09);
        }
        else if (aimAngle !== undefined) {
            fireAngle = aimAngle;
        }
        if (fireAngle !== undefined) {
            flame.setDirectionFromAngle(fireAngle);
        }
        else {
            flame.setDirection(facing);
        }
        flame.setShooterId(playerId);
        this.getEntityManager().addEntity(flame);
        // Broadcast attack event
        this.getEntityManager()
            .getBroadcaster()
            .broadcastEvent(new PlayerAttackedEvent({
            playerId,
            weaponKey: this.getType(),
        }));
    }
}
