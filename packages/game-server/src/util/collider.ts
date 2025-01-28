import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";

function calculateCollisionNormal(hitBox: Rectangle, targetBox: Rectangle): Vector2 {
  const overlapX = Math.min(hitBox.right - targetBox.left, targetBox.right - hitBox.left);
  const overlapY = Math.min(hitBox.bottom - targetBox.top, targetBox.bottom - hitBox.top);

  if (overlapX < overlapY) {
    return new Vector2(overlapX > 0 ? 1 : -1, 0);
  } else {
    return new Vector2(0, overlapY > 0 ? 1 : -1);
  }
}

class Collider {
  private hitBox: Rectangle;
  private targetBox: Rectangle;

  constructor(hitBox: Rectangle, targetBox: Rectangle) {
    this.hitBox = hitBox;
    this.targetBox = targetBox;
  }

  getNormal(): Vector2 {
    return calculateCollisionNormal(this.hitBox, this.targetBox);
  }
}

export default Collider;
