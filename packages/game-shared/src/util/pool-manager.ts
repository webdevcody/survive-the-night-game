import Vector2 from "./vector2";
import { Point, Circle, Line, Rectangle } from "./shape";

class ObjectPool<T> {
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
      () => {
        const pos = this.vector2.claim(0, 0);
        const size = this.vector2.claim(0, 0);
        return new Rectangle(pos, size);
      },
      (rect, position: Vector2 | { x: number; y: number }, size: Vector2 | { x: number; y: number }) => {
        const posX = position instanceof Vector2 ? position.x : position.x;
        const posY = position instanceof Vector2 ? position.y : position.y;
        const sizeX = size instanceof Vector2 ? size.x : size.x;
        const sizeY = size instanceof Vector2 ? size.y : size.y;
        rect.position.reset(posX, posY);
        rect.size.reset(sizeX, sizeY);
        return rect;
      },
      rectanglePoolSize,
      (rect) => {
        // Release the Vector2 instances when releasing the rectangle
        // These are internal Vector2 instances owned by the rectangle
        this.vector2.release(rect.position);
        this.vector2.release(rect.size);
      }
    );

    // Circle pool
    this.circle = new ObjectPool<Circle>(
      () => {
        const pos = this.vector2.claim(0, 0);
        return new Circle(pos, 0);
      },
      (circle, position: Vector2 | { x: number; y: number }, radius: number) => {
        const posX = position instanceof Vector2 ? position.x : position.x;
        const posY = position instanceof Vector2 ? position.y : position.y;
        circle.position.reset(posX, posY);
        circle.radius = radius;
        return circle;
      },
      circlePoolSize,
      (circle) => {
        this.vector2.release(circle.position);
      }
    );

    // Line pool
    this.line = new ObjectPool<Line>(
      () => {
        const start = this.vector2.claim(0, 0);
        const end = this.vector2.claim(0, 0);
        return new Line(start, end);
      },
      (line, start: Vector2 | { x: number; y: number }, end: Vector2 | { x: number; y: number }) => {
        const startX = start instanceof Vector2 ? start.x : start.x;
        const startY = start instanceof Vector2 ? start.y : start.y;
        const endX = end instanceof Vector2 ? end.x : end.x;
        const endY = end instanceof Vector2 ? end.y : end.y;
        line.start.reset(startX, startY);
        line.end.reset(endX, endY);
        line.position = line.start.add(line.end).div(2);
        return line;
      },
      linePoolSize,
      (line) => {
        this.vector2.release(line.start);
        this.vector2.release(line.end);
      }
    );

    // Point pool
    this.point = new ObjectPool<Point>(
      () => {
        const pos = this.vector2.claim(0, 0);
        return new Point(pos);
      },
      (point, position: Vector2 | { x: number; y: number }) => {
        const posX = position instanceof Vector2 ? position.x : position.x;
        const posY = position instanceof Vector2 ? position.y : position.y;
        point.position.reset(posX, posY);
        return point;
      },
      pointPoolSize,
      (point) => {
        this.vector2.release(point.position);
      }
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

