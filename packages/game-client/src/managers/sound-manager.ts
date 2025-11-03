import { GameClient } from "@/client";
import { ClientPositionable } from "@/extensions";
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
  WALK: "walk",
  RUN: "run",
} as const;

export type SoundType = (typeof SOUND_TYPES_TO_MP3)[keyof typeof SOUND_TYPES_TO_MP3];

export type SoundLoadProgressCallback = (
  progress: number,
  total: number,
  soundName: string
) => void;

interface LoopingSound {
  audio: HTMLAudioElement;
  soundType: SoundType;
  playerId: string;
}

export class SoundManager {
  private gameClient: GameClient | null;
  private audioCache: Map<SoundType, HTMLAudioElement>;
  private static readonly MAX_DISTANCE = 400;
  private isMuted: boolean = false;
  private loaded: boolean = false;
  // Track active looping sounds by player ID
  private loopingSounds: Map<string, LoopingSound> = new Map();

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

  /**
   * Update or start a looping positional sound for a player
   */
  public updateLoopingSound(
    playerId: string,
    soundType: SoundType | null,
    position: Vector2
  ): void {
    if (this.isMuted || DEBUG_DISABLE_SOUNDS || !this.gameClient) {
      // If muted, stop any existing sound
      this.stopLoopingSound(playerId);
      return;
    }

    const myPlayer = this.gameClient.getMyPlayer();
    if (!myPlayer) {
      this.stopLoopingSound(playerId);
      return;
    }

    const existingSound = this.loopingSounds.get(playerId);

    // If no sound should be playing, stop existing one
    if (!soundType) {
      this.stopLoopingSound(playerId);
      return;
    }

    // If the same sound is already playing, just update volume
    if (existingSound && existingSound.soundType === soundType) {
      const dist = distance(myPlayer.getPosition(), position);
      const volume = linearFalloff(dist, SoundManager.MAX_DISTANCE) * DEBUG_VOLUME_REDUCTION;
      existingSound.audio.volume = volume;

      // Ensure it's playing
      if (existingSound.audio.paused) {
        existingSound.audio.play().catch(() => {
          // Ignore autoplay errors
        });
      }
      return;
    }

    // Need to change the sound (e.g., from walk to run or vice versa)
    this.stopLoopingSound(playerId);

    // Start new looping sound
    const audio = this.audioCache.get(soundType)?.cloneNode() as HTMLAudioElement;
    if (!audio) return;

    const dist = distance(myPlayer.getPosition(), position);
    const volume = linearFalloff(dist, SoundManager.MAX_DISTANCE) * DEBUG_VOLUME_REDUCTION;

    audio.volume = volume;
    audio.loop = true;

    // Handle looping by listening for 'ended' event (some browsers need this)
    audio.addEventListener("ended", () => {
      if (!audio.paused) {
        audio.currentTime = 0;
        audio.play().catch(() => {
          // Ignore autoplay errors
        });
      }
    });

    this.loopingSounds.set(playerId, {
      audio,
      soundType,
      playerId,
    });

    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  }

  /**
   * Stop a looping sound for a player
   */
  public stopLoopingSound(playerId: string): void {
    const loopingSound = this.loopingSounds.get(playerId);
    if (loopingSound) {
      loopingSound.audio.pause();
      loopingSound.audio.currentTime = 0;
      this.loopingSounds.delete(playerId);
    }
  }

  /**
   * Update volumes for all active looping sounds based on current player position
   */
  public updateLoopingSoundsVolumes(): void {
    if (!this.gameClient || this.isMuted || DEBUG_DISABLE_SOUNDS) return;

    const myPlayer = this.gameClient.getMyPlayer();
    if (!myPlayer) return;

    const myPosition = myPlayer.getPosition();

    // Update volumes for all looping sounds
    this.loopingSounds.forEach((loopingSound, playerId) => {
      // Get the player's current position from game state
      const playerEntity = this.gameClient?.getEntityById(playerId);
      if (!playerEntity || !playerEntity.hasExt(ClientPositionable)) {
        // Player no longer exists, stop the sound
        this.stopLoopingSound(playerId);
        return;
      }

      const playerPosition = playerEntity.getExt(ClientPositionable).getPosition();
      const dist = distance(myPosition, playerPosition);
      const volume = linearFalloff(dist, SoundManager.MAX_DISTANCE) * DEBUG_VOLUME_REDUCTION;
      loopingSound.audio.volume = volume;
    });
  }

  /**
   * Clean up looping sounds for players that no longer exist
   */
  public cleanupLoopingSounds(existingPlayerIds: Set<string>): void {
    const playerIdsToRemove: string[] = [];
    this.loopingSounds.forEach((_, playerId) => {
      if (!existingPlayerIds.has(playerId)) {
        playerIdsToRemove.push(playerId);
      }
    });

    playerIdsToRemove.forEach((playerId) => {
      this.stopLoopingSound(playerId);
    });
  }
}
