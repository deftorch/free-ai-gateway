/**
 * Helper Feature Flags Runtime untuk Free AI Gateway
 * Membaca variabel lingkungan ENABLE_* untuk menyalakan/mematikan modul tertentu.
 */
import { getEnvVarAsBoolFlag } from "./env";

export const featureFlags = {
  /** Memeriksa apakah Admin UI Dashboard (/dashboard) diaktifkan */
  isDashboardEnabled: (): boolean => getEnvVarAsBoolFlag("ENABLE_DASHBOARD"),

  /** Memeriksa apakah endpoint Auto-Discovery LLM lokal (/api/internal/discover) diaktifkan */
  isDiscoveryEnabled: (): boolean => getEnvVarAsBoolFlag("ENABLE_DISCOVERY"),

  /** Memeriksa apakah classifier task 'auto' & smart routing diaktifkan */
  isSmartRoutingEnabled: (): boolean => getEnvVarAsBoolFlag("ENABLE_SMART_ROUTING"),

  /** Memeriksa apakah MCP Protocol Server (/api/mcp) diaktifkan */
  isMcpServerEnabled: (): boolean => getEnvVarAsBoolFlag("ENABLE_MCP_SERVER"),
};
