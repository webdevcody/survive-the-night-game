import { Entities } from "@/constants";
import Positionable from "@/extensions/positionable";
import PoolManager from "@shared/util/pool-manager";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
class Combustible extends ExtensionBase {
    constructor(self, entityFactory, numFires = 3, spreadRadius = 32) {
        super(self, { numFires, spreadRadius });
        this.entityFactory = entityFactory;
    }
    onDeath() {
        const position = this.self.getExt(Positionable).getPosition();
        const numFires = this.serialized.get('numFires');
        const spreadRadius = this.serialized.get('spreadRadius');
        for (let i = 0; i < numFires; i++) {
            const fire = this.entityFactory(Entities.FIRE);
            const randomPosition = this.getRandomPositionInRadius(position, spreadRadius);
            fire.getExt(Positionable).setPosition(randomPosition);
            this.self.getEntityManager().addEntity(fire);
        }
    }
    getRandomPositionInRadius(center, radius) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        const poolManager = PoolManager.getInstance();
        return poolManager.vector2.claim(center.x + Math.cos(angle) * distance, center.y + Math.sin(angle) * distance);
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Combustible.type));
        writer.writeUInt32(this.serialized.get('numFires'));
        writer.writeFloat64(this.serialized.get('spreadRadius'));
    }
}
Combustible.type = "combustible";
export default Combustible;
