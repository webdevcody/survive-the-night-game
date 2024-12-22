import { SoundType } from "@survive-the-night/game-server/src/shared/entities/sound";
import { distance, GenericEntity, Positionable, RawEntity } from "@survive-the-night/game-server";
import { debugDrawHitbox } from "../util/debug";
import { GameState } from "@/state";
import { Renderable } from "./util";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { getPlayer } from "../util/get-player";
import { linearFalloff } from "../util/math";

export class SoundClient extends GenericEntity implements Renderable {
  private soundType: SoundType | undefined;
  private audio: HTMLAudioElement | null = null;
  private gameState: GameState;
  private hasPlayed: boolean = false;

  constructor(data: RawEntity, gameState: GameState) {
    super(data);
    this.soundType = data.soundType;
    this.gameState = gameState;
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  public loadAndPlay(): void {
    this.hasPlayed = true;
    this.audio = new Audio(`/sounds/${this.soundType}.mp3`);
    try {
      const position = this.getExt(Positionable).getCenterPosition();
      const player = getPlayer(this.gameState);
      if (player) {
        const distanceToPlayer = distance(position, player.getPosition());
        this.audio.volume = linearFalloff(distanceToPlayer, 800);
      }
      this.audio.play().catch((error) => {
        console.warn(`Failed to play sound '${this.soundType}': ${error.message}`);
      });
    } catch (error) {
      console.error("Error playing sound", error);
    }
  }

  public deserialize(data: RawEntity): void {
    super.deserialize(data);
    this.soundType = data.soundType;
    if (!this.hasPlayed) {
      this.loadAndPlay();
    }
  }

  public serialize(): RawEntity {
    return {
      ...super.serialize(),
      soundType: this.soundType,
    };
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const positionable = this.getExt(Positionable);
    const centerPosition = positionable.getCenterPosition();

    debugDrawHitbox(
      ctx,
      {
        x: centerPosition.x,
        y: centerPosition.y,
        width: 10,
        height: 10,
      },
      "red"
    );
  }
}
