import { SoundType } from "@survive-the-night/game-server/src/shared/entities/sound";
import { IClientEntity } from "./util";

export class SoundClient implements IClientEntity {
  private id: string;
  private soundType: SoundType;

  public constructor(id: string, soundType: SoundType) {
    this.id = id;
    this.soundType = soundType;
    const audio = new Audio(`/sounds/${soundType}.mp3`);
    audio.play();
  }

  public getId(): string {
    return this.id;
  }
}
