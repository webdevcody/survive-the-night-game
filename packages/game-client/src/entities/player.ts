import {
  Entities,
  EntityType,
  Positionable,
  roundVector2,
  Vector2,
  normalizeVector,
  InventoryItem,
  Damageable,
  Hitbox,
} from "@survive-the-night/game-server";
import { AssetManager, getItemAssetKey } from "../managers/asset";
import { InputManager } from "@/managers/input";
import { IClientEntity, Renderable } from "./util";
import { GameState } from "@/state";
import { getHitboxWithPadding } from "@survive-the-night/game-server/src/shared/entities/util";
import { debugDrawHitbox } from "../util/debug";

export class PlayerClient implements IClientEntity, Renderable, Positionable, Damageable {
  private assetManager: AssetManager;
  private inputManager: InputManager;
  private lastRenderPosition = { x: 0, y: 0 };
  private readonly LERP_FACTOR = 0.1;
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };
  private id: string;
  private type: EntityType;
  private readonly ARROW_LENGTH = 20;
  private health = 10;
  private inventory: InventoryItem[] = [];
  private activeItem: InventoryItem | null = null;

  constructor(id: string, assetManager: AssetManager, inputManager: InputManager) {
    this.id = id;
    this.type = Entities.PLAYER;
    this.assetManager = assetManager;
    this.inputManager = inputManager;
  }

  getInventory(): InventoryItem[] {
    return this.inventory;
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
  }

  getType(): EntityType {
    return this.type;
  }

  setType(type: EntityType): void {
    this.type = type;
  }

  getPosition(): Vector2 {
    return this.position;
  }

  setPosition(position: Vector2): void {
    this.position = position;
  }

  getCenterPosition(): Vector2 {
    return this.position;
  }

  setVelocity(velocity: Vector2): void {
    this.velocity = velocity;
  }

  getDamageBox(): Hitbox {
    return getHitboxWithPadding(this.position, 0);
  }

  damage(damage: number): void {
    this.health -= damage;
  }

  getHealth(): number {
    return this.health;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const targetPosition = this.getPosition();
    const { facing } = this.inputManager.getInputs();
    const image = this.assetManager.getWithDirection("Player", facing);

    this.lastRenderPosition.x += (targetPosition.x - this.lastRenderPosition.x) * this.LERP_FACTOR;
    this.lastRenderPosition.y += (targetPosition.y - this.lastRenderPosition.y) * this.LERP_FACTOR;

    const renderPosition = roundVector2(this.lastRenderPosition);

    ctx.drawImage(image, renderPosition.x, renderPosition.y);
    this.renderWeapon(ctx, renderPosition);

    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);

    if (speed > 0) {
      this.renderArrow(ctx, image, renderPosition);
    }

    debugDrawHitbox(ctx, this.getDamageBox(), "red");
  }

  renderArrow(ctx: CanvasRenderingContext2D, image: HTMLImageElement, renderPosition: Vector2) {
    const direction = normalizeVector(this.velocity);

    const arrowStart = {
      x: renderPosition.x + image.width / 2,
      y: renderPosition.y + image.height / 2,
    };

    const arrowEnd = {
      x: arrowStart.x + direction.x * this.ARROW_LENGTH,
      y: arrowStart.y + direction.y * this.ARROW_LENGTH,
    };

    ctx.beginPath();
    ctx.moveTo(arrowStart.x, arrowStart.y);
    ctx.lineTo(arrowEnd.x, arrowEnd.y);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.stroke();

    const headLength = 8;
    const angle = Math.atan2(direction.y, direction.x);

    ctx.beginPath();
    ctx.moveTo(arrowEnd.x, arrowEnd.y);
    ctx.lineTo(
      arrowEnd.x - headLength * Math.cos(angle - Math.PI / 6),
      arrowEnd.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      arrowEnd.x - headLength * Math.cos(angle + Math.PI / 6),
      arrowEnd.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = "red";
    ctx.fill();
  }

  renderWeapon(ctx: CanvasRenderingContext2D, renderPosition: Vector2) {
    if (this.activeItem === null) {
      return;
    }
    const { facing } = this.inputManager.getInputs();
    const image = this.assetManager.getWithDirection(getItemAssetKey(this.activeItem), facing);
    ctx.drawImage(image, renderPosition.x + 2, renderPosition.y);
  }
}
