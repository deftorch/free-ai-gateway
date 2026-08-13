export class NoAvailableKeyError extends Error {
  constructor(public readonly nextAvailableAt: number) {
    super("Semua key dalam pool sedang dalam masa cooldown");
    this.name = "NoAvailableKeyError";
  }
}

export const DEFAULT_COOLDOWN_MS = 30000;

export class KeyPoolManager {
  private index = 0;
  private cooldowns = new Map<string, number>();

  constructor(private readonly keys: string[]) {
    if (!keys || keys.length === 0) {
      throw new Error("KeyPoolManager requires at least one key");
    }
  }

  markCooldown(key: string, durationMs: number = DEFAULT_COOLDOWN_MS): void {
    this.cooldowns.set(key, Date.now() + durationMs);
  }

  getCooldownUntil(key: string): number | undefined {
    return this.cooldowns.get(key);
  }

  selectNextKey(): string {
    const now = Date.now();
    let minCooldown = Infinity;
    
    for (let i = 0; i < this.keys.length; i++) {
      const currentIdx = (this.index + i) % this.keys.length;
      const key = this.keys[currentIdx]!;
      const cooldownUntil = this.cooldowns.get(key) || 0;

      if (cooldownUntil <= now) {
        this.index = (currentIdx + 1) % this.keys.length;
        return key;
      }
      
      if (cooldownUntil < minCooldown) {
        minCooldown = cooldownUntil;
      }
    }

    // SENGAJA belum ada: Background health-check job (Step TBD)
    throw new NoAvailableKeyError(minCooldown);
  }
}
