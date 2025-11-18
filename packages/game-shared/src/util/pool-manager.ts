import Vector2 from "./vector2";
import { Point, Circle, Line, Rectangle } from "./shape";

export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T, ...args: any[]) => T;
  private releaseFn?: (obj: T) => void;
  private initialSize: number;

  constructor(
    createFn: () => T,
    resetFn: (obj: T, ...args: any[]) => T,
    initialSize: number = 100,
    releaseFn?: (obj: T) => void
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.releaseFn = releaseFn;
    this.initialSize = initialSize;
    this.initialize();
  }

  private initialize(): void {
    for (let i = 0; i < this.initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  claim(...args: any[]): T {
    let obj: T;
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.createFn();
    }
    return this.resetFn(obj, ...args);
  }

  release(obj: T): void {
    if (this.releaseFn) {
      this.releaseFn(obj);
    }
    this.pool.push(obj);
  }
}

export class PoolManager {
  private static instance: PoolManager;

  public readonly vector2: ObjectPool<Vector2>;
  public readonly rectangle: ObjectPool<Rectangle>;
  public readonly circle: ObjectPool<Circle>;
  public readonly line: ObjectPool<Line>;
  public readonly point: ObjectPool<Point>;

  private constructor(
    vector2PoolSize: number = 500,
    rectanglePoolSize: number = 200,
    circlePoolSize: number = 100,
    linePoolSize: number = 200,
    pointPoolSize: number = 100
  ) {
    // Vector2 pool
    this.vector2 = new ObjectPool<Vector2>(
      () => new Vector2(0, 0),
      (vec, x: number = 0, y: number = 0) => vec.reset(x, y),
      vector2PoolSize
    );

    // Rectangle pool - needs Vector2 instances for position and size
    this.rectangle = new ObjectPool<Rectangle>(
      () => new Rectangle(new Vector2(0, 0), new Vector2(0, 0)),
      (
        rect,
        position: Vector2 | { x: number; y: number },
        size: Vector2 | { x: number; y: number }
      ) => {
        const pos = position as { x: number; y: number };
        const sz = size as { x: number; y: number };
        const posX = pos.x;
        const posY = pos.y;
        const sizeX = sz.x;
        const sizeY = sz.y;
        rect.position.reset(posX, posY);
        rect.size.reset(sizeX, sizeY);
        return rect;
      },
      rectanglePoolSize
    );

    // Circle pool
    this.circle = new ObjectPool<Circle>(
      () => new Circle(new Vector2(0, 0), 0),
      (circle, position: Vector2 | { x: number; y: number }, radius: number) => {
        const pos = position as { x: number; y: number };
        circle.position.reset(pos.x, pos.y);
        circle.radius = radius;
        return circle;
      },
      circlePoolSize
    );

    // Line pool
    this.line = new ObjectPool<Line>(
      () => new Line(new Vector2(0, 0), new Vector2(0, 0)),
      (
        line,
        start: Vector2 | { x: number; y: number },
        end: Vector2 | { x: number; y: number }
      ) => {
        const s = start as { x: number; y: number };
        const e = end as { x: number; y: number };
        const startX = s.x;
        const startY = s.y;
        const endX = e.x;
        const endY = e.y;
        line.start.reset(startX, startY);
        line.end.reset(endX, endY);
        line.position.reset((startX + endX) / 2, (startY + endY) / 2);
        return line;
      },
      linePoolSize
    );

    // Point pool
    this.point = new ObjectPool<Point>(
      () => new Point(new Vector2(0, 0)),
      (point, position: Vector2 | { x: number; y: number }) => {
        const pos = position as { x: number; y: number };
        point.position.reset(pos.x, pos.y);
        return point;
      },
      pointPoolSize
    );
  }

  public static getInstance(): PoolManager {
    if (!PoolManager.instance) {
      PoolManager.instance = new PoolManager();
    }
    return PoolManager.instance;
  }

  public static reset(): void {
    PoolManager.instance = new PoolManager();
  }
}

export default PoolManager;
