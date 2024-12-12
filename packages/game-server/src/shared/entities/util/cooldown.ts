export class Cooldown {
  private timeRemaining: number = 0;
  private duration: number;

  constructor(duration: number) {
    this.duration = duration;
    this.reset();
  }

  update(deltaTime: number): void {
    this.timeRemaining = Math.max(0, this.timeRemaining - deltaTime);
  }

  reset(): void {
    this.timeRemaining = this.duration;
  }

  isReady(): boolean {
    return this.timeRemaining <= 0;
  }
}
