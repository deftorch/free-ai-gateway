import type { ProviderAdapter } from "./types";

class ProviderRegistryManager {
  private registry: Map<string, ProviderAdapter> = new Map();

  /**
   * Mendaftarkan provider baru ke sistem (Plugin Pattern)
   */
  register(adapter: ProviderAdapter) {
    if (this.registry.has(adapter.id)) {
      console.warn(`Provider ${adapter.id} sudah terdaftar, akan ditimpa.`);
    }
    this.registry.set(adapter.id, adapter);
  }

  /**
   * Mengambil adapter berdasarkan ID
   */
  get(providerId: string): ProviderAdapter | undefined {
    return this.registry.get(providerId);
  }

  /**
   * Mengembalikan semua provider yang terdaftar
   */
  getAll(): ProviderAdapter[] {
    return Array.from(this.registry.values());
  }

  /**
   * Memfilter provider berdasarkan kapabilitas manifest.
   * Berguna untuk smart router otomatis.
   */
  filterByCapability(criteria: { vision?: boolean; toolCalling?: boolean; pricing?: string }): ProviderAdapter[] {
    return this.getAll().filter((adapter) => {
      let match = true;
      if (criteria.vision !== undefined && adapter.manifest.capabilities.vision !== criteria.vision) match = false;
      if (criteria.toolCalling !== undefined && adapter.manifest.capabilities.toolCalling !== criteria.toolCalling) match = false;
      if (criteria.pricing !== undefined && adapter.manifest.pricing !== criteria.pricing) match = false;
      return match;
    });
  }
}

// Global Singleton Registry
export const providerRegistry = new ProviderRegistryManager();
