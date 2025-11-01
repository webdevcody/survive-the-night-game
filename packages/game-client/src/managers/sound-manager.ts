import { GameClient } from "@/client";
import { linearFalloff } from "@/util/math";
import { DEBUG_DISABLE_SOUNDS, DEBUG_VOLUME_REDUCTION } from "@shared/debug";
import { distance } from "@shared/util/physics";
import Vector2 from "@shared/util/vector2";

// these values must match the sound files in the client
export const SOUND_TYPES_TO_MP3 = {
  PISTOL: "pistol",
  PLAYER_HURT: "player_hurt",
  PICK_UP_ITEM: "pick_up_item",
  DROP_ITEM: "drop_item",
  PLAYER_DEATH: "player_death",
  ZOMBIE_DEATH: "zombie_death",
  ZOMBIE_HURT: "zombie_hurt",
  SHOTGUN_FIRE: "shotgun_fire",
  ZOMBIE_ATTACKED: "zombie_bite",
  GUN_EMPTY: "gun_empty",
  KNIFE_ATTACK: "knife_swing",
  EXPLOSION: "explosion",
  COIN_PICKUP: "coin_pickup",
  LOOT: "loot",
  BOLT_ACTION_RIFLE: "bolt_action_rifle",
  AK47: "ak47",
} as const;

export type SoundType = (typeof SOUND_TYPES_TO_MP3)[keyof typeof SOUND_TYPES_TO_MP3];

export type SoundLoadProgressCallback = (
  progress: number,
  total: number,
  soundName: string
) => void;

export class SoundManager {
  private gameClient: GameClient | null;
  private audioCache: Map<SoundType, HTMLAudioElement>;
  private static readonly MAX_DISTANCE = 800;
  private isMuted: boolean = false;
  private loaded: boolean = false;

  constructor(gameClient?: GameClient) {
    this.gameClient = gameClient || null;
    this.audioCache = new Map();
  }

  /**
   * Preload all sounds with optional progress tracking
   */
  public async preloadSounds(onProgress?: SoundLoadProgressCallback): Promise<void> {
    if (this.loaded) return;

    const soundTypes = Object.values(SOUND_TYPES_TO_MP3);
    const loadPromises: Promise<void>[] = [];

    soundTypes.forEach((soundType, index) => {
      const loadPromise = new Promise<void>((resolve, reject) => {
        const audio = new Audio(this.getSrc(soundType));
        audio.preload = "auto";

        audio.addEventListener(
          "canplaythrough",
          () => {
            onProgress?.(index + 1, soundTypes.length, soundType);
            resolve();
          },
          { once: true }
        );

        audio.addEventListener(
          "error",
          () => {
            console.warn(`Failed to load sound: ${soundType}`);
            resolve(); // Don't reject, just continue
          },
          { once: true }
        );

        this.audioCache.set(soundType, audio);
      });

      loadPromises.push(loadPromise);
    });

    await Promise.all(loadPromises);
    this.loaded = true;
  }

  /**
   * Set the game client reference (for positional audio)
   */
  public setGameClient(gameClient: GameClient): void {
    this.gameClient = gameClient;
  }

  public toggleMute(): void {
    this.isMuted = !this.isMuted;
  }

  public getMuteState(): boolean {
    return this.isMuted;
  }

  public playPositionalSound(sound: SoundType, position: Vector2) {
    if (this.isMuted || DEBUG_DISABLE_SOUNDS || !this.gameClient) return;

    const myPlayer = this.gameClient.getMyPlayer();
    if (!myPlayer) return;

    const dist = distance(myPlayer.getPosition(), position);
    const volume = linearFalloff(dist, SoundManager.MAX_DISTANCE) * DEBUG_VOLUME_REDUCTION;

    const audio = this.audioCache.get(sound)?.cloneNode() as HTMLAudioElement;
    if (audio) {
      audio.volume = volume;
      audio.play();
    }
  }

  public getSrc(sound: SoundType): string {
    return `./sounds/${sound}.mp3`;
  }
}
