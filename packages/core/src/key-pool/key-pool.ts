export class KeyPoolManager {
  private index = 0;

  constructor(private readonly keys: string[]) {
    if (!keys || keys.length === 0) {
      throw new Error("KeyPoolManager requires at least one key");
    }
  }

  selectNextKey(): string {
    const key = this.keys[this.index % this.keys.length]!;
    this.index++;
    return key;
  }
}
