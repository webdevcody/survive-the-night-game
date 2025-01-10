import Entity from "./entity";

const FPS = 30;
const TICK_RATE_MS = 1000 / FPS;

class World {
  // fixed update
  #lastUpdateTime: number = 0;
  #accumulatedTime: number = 0;

  // optional
  #isFrozzen: boolean = true;

  // store entites
  #createEntities: Map<number, Entity>;
  #updateEntities: Map<number, Entity>;
  #removeEntities: Set<number>;

  get createEntities() {
    return this.#createEntities.values();
  }

  get updateEntities() {
    return this.#updateEntities.values();
  }

  get removeEntities() {
    return this.#removeEntities.values();
  }

  constructor() {
    this.#createEntities = new Map();
    this.#updateEntities = new Map();
    this.#removeEntities = new Set();
  }

  createEntity(entity: Entity) {
    if (this.#createEntities.has(entity.id) || this.#updateEntities.has(entity.id)) {
      throw new Error();
    }

    if (this.#removeEntities.has(entity.id)) {
      this.#removeEntities.delete(entity.id);
    }

    this.#createEntities.set(entity.id, entity);

    if (this.#updateEntities.size == 0) {
      this.#isFrozzen = false;
    }
  }

  removeEntity(entity: Entity) {
    if (this.#removeEntities.has(entity.id) || !this.#updateEntities.has(entity.id)) {
      throw new Error();
    }

    if (this.#createEntities.has(entity.id)) {
      this.#createEntities.delete(entity.id);
    }

    this.#removeEntities.add(entity.id);

    if (this.#updateEntities.size - this.#removeEntities.size == 0) {
      this.#isFrozzen = true;
    }
  }

  tick(): void {
    const startUpdateTime = performance.now();
    const deltaTime = startUpdateTime - this.#lastUpdateTime;
    this.update(deltaTime);
    this.#lastUpdateTime = startUpdateTime;
  }

  update(deltaTime: number) {
    if (!this.#isFrozzen) {
      for (const [id, entity] of this.#createEntities) {
        this.#updateEntities.set(id, entity);
      }

      for (const id of this.#removeEntities) {
        this.#updateEntities.delete(id);
      }

      this.#accumulatedTime += deltaTime;

      while (this.#accumulatedTime >= TICK_RATE_MS) {
        this.fixedUpdate(TICK_RATE_MS / 1000);
        this.#accumulatedTime -= TICK_RATE_MS;
      }
    }
  }

  private fixedUpdate(deltaTime: number) {
    // TODO physic fixed update
    console.log("fixed update");
  }
}

export default World;
