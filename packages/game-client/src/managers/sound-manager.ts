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
  ZOMBIE_GROWL: "growl",
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
  REPAIR: "repair",
  HORN: "horn",
  CRAFT: "craft",
  BUILD: "build",
  MUSIC: "music",
  BATTLE: "battle",
  CAMPFIRE: "campfire",
} as const;

export type SoundType = (typeof SOUND_TYPES_TO_MP3)[keyof typeof SOUND_TYPES_TO_MP3];

/**
 * Base volume map for each sound type (0-1 scale).
 * This allows adjusting sound volumes without editing the audio files.
 * Values default to 1.0 if not specified.
 */
export const SOUND_VOLUME_MAP: Partial<Record<SoundType, number>> = {
  // Add volume adjustments here (0-1 scale)
  // Example: pistol: 0.8, explosion: 0.9, walk: 0.7, etc.
  // If a sound is not in this map, it defaults to 1.0
  walk: 0.3,
  run: 0.3,
  gun_empty: 0.5,
  pistol: 0.5,
  drop_item: 0.5,
  loot: 0.5,
  pick_up_item: 0.5,
  zombie_hurt: 0.5,
  growl: 0.5,
  player_hurt: 0.6,
  zombie_death: 0.5,
  horn: 0.2,
  build: 0.5,
  music: 0.3, // Background music volume (lower than sound effects)
  battle: 0.4, // Battle music volume (slightly louder than background music)
  campfire: 0.2, // Campfire ambient sound volume
} as const;

export type SoundLoadProgressCallback = (
  progress: number,
  total: number,
  soundName: string
) => void;

interface LoopingSound {
  audio: HTMLAudioElement;
  soundType: SoundType;
  playerId: number;
}

export class SoundManager {
  private gameClient: GameClient | null;
  private audioCache: Map<SoundType, HTMLAudioElement>;
  private static readonly MAX_DISTANCE = 400;
  private isMuted: boolean = false;
  private loaded: boolean = false;
  // Track active looping sounds by player ID
  private loopingSounds: Map<number, LoopingSound> = new Map();
  // Background music audio element
  private backgroundMusic: HTMLAudioElement | null = null;
  // Battle music audio element (plays during waves)
  private battleMusic: HTMLAudioElement | null = null;
  // Campfire ambient sound (always playing, volume adjusted by distance)
  private campfireSound: HTMLAudioElement | null = null;

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
    // Update background music mute state
    if (this.backgroundMusic) {
      this.backgroundMusic.muted = this.isMuted;
    }
    // Update battle music mute state
    if (this.battleMusic) {
      this.battleMusic.muted = this.isMuted;
    }
    // Update campfire sound mute state
    if (this.campfireSound) {
      this.campfireSound.muted = this.isMuted;
    }
  }

  public getMuteState(): boolean {
    return this.isMuted;
  }

  /**
   * Get the base volume for a sound type (defaults to 1.0 if not configured)
   */
  private getBaseVolume(sound: SoundType): number {
    return SOUND_VOLUME_MAP[sound] ?? 1.0;
  }

  public playPositionalSound(sound: SoundType, position: Vector2) {
    if (this.isMuted || DEBUG_DISABLE_SOUNDS || !this.gameClient) return;

    const myPlayer = this.gameClient.getMyPlayer();
    if (!myPlayer || !myPlayer.hasExt(ClientPositionable)) return;

    const dist = distance(myPlayer.getExt(ClientPositionable).getPosition(), position);
    const baseVolume = this.getBaseVolume(sound);
    const volume =
      baseVolume * linearFalloff(dist, SoundManager.MAX_DISTANCE) * DEBUG_VOLUME_REDUCTION;

    // Create a new Audio element from the cached source to avoid issues with cloneNode
    const cachedAudio = this.audioCache.get(sound);
    if (!cachedAudio) return;

    const audio = new Audio(cachedAudio.src);
    audio.volume = volume;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  }

  public getSrc(sound: SoundType): string {
    return `./sounds/${sound}.mp3`;
  }

  /**
   * Update or start a looping positional sound for a player
   */
  public updateLoopingSound(
    playerId: number,
    soundType: SoundType | null,
    position: Vector2
  ): void {
    if (this.isMuted || DEBUG_DISABLE_SOUNDS || !this.gameClient) {
      // If muted, stop any existing sound
      this.stopLoopingSound(playerId);
      return;
    }

    const myPlayer = this.gameClient.getMyPlayer();
    if (!myPlayer || !myPlayer.hasExt(ClientPositionable)) {
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
      const dist = distance(myPlayer.getExt(ClientPositionable).getPosition(), position);
      const baseVolume = this.getBaseVolume(soundType);
      const volume =
        baseVolume * linearFalloff(dist, SoundManager.MAX_DISTANCE) * DEBUG_VOLUME_REDUCTION;
      existingSound.audio.volume = volume;

      // Ensure it's playing (but don't call play() if it's already playing to avoid re-requests)
      if (existingSound.audio.paused && existingSound.audio.readyState >= 2) {
        existingSound.audio.play().catch(() => {
          // Ignore autoplay errors
        });
      }
      return;
    }

    // Need to change the sound (e.g., from walk to run or vice versa)
    this.stopLoopingSound(playerId);

    // Start new looping sound - create new Audio element from cached source
    const cachedAudio = this.audioCache.get(soundType);
    if (!cachedAudio) {
      console.warn(`Sound not cached yet: ${soundType}`);
      return;
    }
    // Clone the audio element instead of creating new one to avoid re-fetching
    const audio = cachedAudio.cloneNode() as HTMLAudioElement;

    const dist = distance(myPlayer.getExt(ClientPositionable).getPosition(), position);
    const baseVolume = this.getBaseVolume(soundType);
    const volume =
      baseVolume * linearFalloff(dist, SoundManager.MAX_DISTANCE) * DEBUG_VOLUME_REDUCTION;

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
  public stopLoopingSound(playerId: number): void {
    const loopingSound = this.loopingSounds.get(playerId);
    if (loopingSound) {
      loopingSound.audio.pause();
      loopingSound.audio.currentTime = 0;
      this.loopingSounds.delete(playerId);
    }
  }

  /**
   * Update volumes for all active looping sounds based on current player position
   * Skips sounds that don't have corresponding entities
   * as those are handled separately
   */
  public updateLoopingSoundsVolumes(): void {
    if (!this.gameClient || this.isMuted || DEBUG_DISABLE_SOUNDS) return;

    const myPlayer = this.gameClient.getMyPlayer();
    if (!myPlayer || !myPlayer.hasExt(ClientPositionable)) return;

    const myPosition = myPlayer.getExt(ClientPositionable).getPosition();

    // Update volumes for all looping sounds
    this.loopingSounds.forEach((loopingSound, entityId) => {
      // Skip campfire sounds - they're handled separately in updateCampfireSounds
      if (loopingSound.soundType === SOUND_TYPES_TO_MP3.CAMPFIRE) {
        return;
      }

      // Get the entity's current position from game state
      const entity = this.gameClient?.getEntityById(entityId);
      if (!entity || !entity.hasExt(ClientPositionable)) {
        // Entity no longer exists, stop the sound
        this.stopLoopingSound(entityId);
        return;
      }

      const entityPosition = entity.getExt(ClientPositionable).getPosition();
      const dist = distance(myPosition, entityPosition);
      const baseVolume = this.getBaseVolume(loopingSound.soundType);
      const volume =
        baseVolume * linearFalloff(dist, SoundManager.MAX_DISTANCE) * DEBUG_VOLUME_REDUCTION;
      loopingSound.audio.volume = volume;
    });
  }

  /**
   * Clean up looping sounds for players that no longer exist
   */
  public cleanupLoopingSounds(existingPlayerIds: Set<number>): void {
    const playerIdsToRemove: number[] = [];
    this.loopingSounds.forEach((_, playerId) => {
      if (!existingPlayerIds.has(playerId)) {
        playerIdsToRemove.push(playerId);
      }
    });

    playerIdsToRemove.forEach((playerId) => {
      this.stopLoopingSound(playerId);
    });
  }

  /**
   * Clean up looping sounds for entities that no longer exist, filtered by sound type
   */
  public cleanupLoopingSoundsByType(existingEntityIds: Set<number>, soundType: SoundType): void {
    const entityIdsToRemove: number[] = [];
    this.loopingSounds.forEach((loopingSound, entityId) => {
      if (loopingSound.soundType === soundType && !existingEntityIds.has(entityId)) {
        entityIdsToRemove.push(entityId);
      }
    });

    entityIdsToRemove.forEach((entityId) => {
      this.stopLoopingSound(entityId);
    });
  }

  /**
   * Start playing background music (non-positional, looping)
   */
  public playBackgroundMusic(): void {
    if (this.backgroundMusic) {
      // Already playing, just ensure it's not paused
      if (this.backgroundMusic.paused) {
        this.backgroundMusic.play().catch(() => {
          // Ignore autoplay errors
        });
      }
      return;
    }

    if (DEBUG_DISABLE_SOUNDS) return;

    const cachedAudio = this.audioCache.get(SOUND_TYPES_TO_MP3.MUSIC);
    if (!cachedAudio) {
      console.warn("Background music not loaded");
      return;
    }
    const audio = new Audio(cachedAudio.src);

    const baseVolume = this.getBaseVolume(SOUND_TYPES_TO_MP3.MUSIC);
    audio.volume = baseVolume * DEBUG_VOLUME_REDUCTION;
    audio.loop = true;
    audio.muted = this.isMuted;

    // Handle looping by listening for 'ended' event (some browsers need this)
    audio.addEventListener("ended", () => {
      if (!audio.paused) {
        audio.currentTime = 0;
        audio.play().catch(() => {
          // Ignore autoplay errors
        });
      }
    });

    this.backgroundMusic = audio;
    audio.play().catch(() => {
      // Ignore autoplay errors (browser may block autoplay)
      console.log("Background music autoplay blocked by browser");
    });
  }

  /**
   * Stop background music
   */
  public stopBackgroundMusic(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
      this.backgroundMusic = null;
    }
  }

  /**
   * Start playing battle music (non-positional, looping)
   * Plays on top of background music during waves
   */
  public playBattleMusic(): void {
    if (this.battleMusic) {
      // Already playing, just ensure it's not paused
      if (this.battleMusic.paused) {
        this.battleMusic.play().catch(() => {
          // Ignore autoplay errors
        });
      }
      return;
    }

    if (DEBUG_DISABLE_SOUNDS) return;

    const cachedAudio = this.audioCache.get(SOUND_TYPES_TO_MP3.BATTLE);
    if (!cachedAudio) {
      console.warn("Battle music not loaded");
      return;
    }
    const audio = new Audio(cachedAudio.src);

    const baseVolume = this.getBaseVolume(SOUND_TYPES_TO_MP3.BATTLE);
    audio.volume = baseVolume * DEBUG_VOLUME_REDUCTION;
    audio.loop = true;
    audio.muted = this.isMuted;

    // Handle looping by listening for 'ended' event (some browsers need this)
    audio.addEventListener("ended", () => {
      if (!audio.paused) {
        audio.currentTime = 0;
        audio.play().catch(() => {
          // Ignore autoplay errors
        });
      }
    });

    this.battleMusic = audio;
    audio.play().catch(() => {
      // Ignore autoplay errors (browser may block autoplay)
      console.log("Battle music autoplay blocked by browser");
    });
  }

  /**
   * Stop battle music
   */
  public stopBattleMusic(): void {
    if (this.battleMusic) {
      this.battleMusic.pause();
      this.battleMusic.currentTime = 0;
      this.battleMusic = null;
    }
  }

  /**
   * Update campfire sound volume based on distance from player
   * The sound is always playing on loop, we just adjust the volume
   */
  public updateCampfireSoundVolume(position: Vector2 | null): void {
    if (this.isMuted || DEBUG_DISABLE_SOUNDS || !this.gameClient) {
      // If muted, stop the sound
      if (this.campfireSound) {
        this.campfireSound.pause();
        this.campfireSound.currentTime = 0;
      }
      return;
    }

    const myPlayer = this.gameClient.getMyPlayer();
    if (!myPlayer || !myPlayer.hasExt(ClientPositionable) || !position) {
      // No player or no campsite fire position, stop the sound
      if (this.campfireSound) {
        this.campfireSound.pause();
        this.campfireSound.currentTime = 0;
      }
      return;
    }

    // Initialize campfire sound if it doesn't exist
    if (!this.campfireSound) {
      const cachedAudio = this.audioCache.get(SOUND_TYPES_TO_MP3.CAMPFIRE);
      if (!cachedAudio) {
        // Sound not loaded yet, try again next frame
        return;
      }

      const audio = cachedAudio.cloneNode() as HTMLAudioElement;
      audio.loop = true;
      audio.muted = this.isMuted;

      // Handle looping by listening for 'ended' event (some browsers need this)
      audio.addEventListener("ended", () => {
        if (!audio.paused) {
          audio.currentTime = 0;
          audio.play().catch(() => {
            // Ignore autoplay errors
          });
        }
      });

      this.campfireSound = audio;
      // Start playing immediately
      audio.play().catch(() => {
        // Ignore autoplay errors (browser may block autoplay)
        console.log("Campfire sound autoplay blocked by browser");
      });
    }

    // Calculate volume based on distance
    const dist = distance(myPlayer.getExt(ClientPositionable).getPosition(), position);
    const baseVolume = this.getBaseVolume(SOUND_TYPES_TO_MP3.CAMPFIRE);
    const volume = baseVolume * linearFalloff(dist, 200) * DEBUG_VOLUME_REDUCTION;

    this.campfireSound.volume = volume;

    // Ensure it's playing
    if (this.campfireSound.paused) {
      this.campfireSound.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }

  /**
   * Stop campfire sound
   */
  public stopCampfireSound(): void {
    if (this.campfireSound) {
      this.campfireSound.pause();
      this.campfireSound.currentTime = 0;
      this.campfireSound = null;
    }
  }
}
