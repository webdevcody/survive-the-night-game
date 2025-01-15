import { GameClient } from "@/client";
import { linearFalloff } from "../util/math";
import { distance, Vector2 } from "@survive-the-night/game-server";
import {
  DEBUG_DISABLE_SOUNDS,
  DEBUG_VOLUME_REDUCTION,
} from "@survive-the-night/game-server/src/config/debug";

// these values must match the sound files in the client
export const SOUND_TYPES = {
  PISTOL: "pistol",
  PLAYER_HURT: "player_hurt",
  PICK_UP_ITEM: "pick_up_item",
  DROP_ITEM: "drop_item",
  PLAYER_DEATH: "player_death",
  ZOMBIE_DEATH: "zombie_death",
  ZOMBIE_HURT: "zombie_hurt",
  SHOTGUN_FIRE: "shotgun_fire",
  ZOMBIE_ATTACKED: "zombie_bite",
  LOOT: "loot",
} as const;

export type SoundType = (typeof SOUND_TYPES)[keyof typeof SOUND_TYPES];

export class SoundManager {
  private gameClient: GameClient;
  private audioCache: Map<SoundType, HTMLAudioElement>;
  private static readonly MAX_DISTANCE = 800;

  constructor(gameClient: GameClient) {
    this.gameClient = gameClient;
    this.audioCache = new Map();
    this.preloadSounds();
  }

  private preloadSounds() {
    // Create and cache an audio element for each sound type
    Object.values(SOUND_TYPES).forEach((soundType) => {
      const audio = new Audio(this.getSrc(soundType));
      audio.preload = "auto"; // Ensure the browser preloads the sound
      this.audioCache.set(soundType, audio);
    });
  }

  public playPositionalSound(sound: SoundType, position: Vector2) {
    const myPlayer = this.gameClient.getMyPlayer();
    if (!myPlayer) return;

    const dist = distance(myPlayer.getPosition(), position);
    const volume = linearFalloff(dist, SoundManager.MAX_DISTANCE) * DEBUG_VOLUME_REDUCTION;

    const audio = this.audioCache.get(sound)?.cloneNode() as HTMLAudioElement;
    if (audio) {
      audio.volume = volume;

      if (!DEBUG_DISABLE_SOUNDS) {
        audio.play();
      }
    }
  }

  public getSrc(sound: SoundType): string {
    return `./sounds/${sound}.mp3`;
  }
}
