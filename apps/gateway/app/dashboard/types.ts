export interface ApiKeyRow {
  id: string;
  providerId: string;
  label: string;
  status: string;
  errorCount: number;
  lastUsedAt: string | null;
  quotaScopeHint: string | null;
  /** Dihitung server-side di `/internal/keys` (bukan kolom DB langsung). */
  ageDays?: number;
  needsRotation?: boolean;
}

export interface GatewayTokenRow {
  id: string;
  projectLabel: string;
  tokenHash: string;
  status: string;
  createdAt: string;
  storeBody: boolean;
  allowedModels?: string[] | null;
  maxDailyRequests?: number | null;
  usedToday?: number;
}

export interface ModelRow {
  id: string;
  providerId: string;
  modelId: string;
  displayName: string | null;
  status: string;
  isFreeTier: boolean;
  supportsVision: boolean;
  supportsCoding: boolean;
  needsReview: boolean;
  lastVerifiedAt: string | null;
}

export interface ProviderCapacityMetric {
  providerId: string;
  totalKeys: number;
  activeKeys: number;
  readyKeys: number;
  cooldownKeys: number;
  exhaustedKeys: number;
  disabledKeys: number;
  totalRpdLimit: number;
  totalRpdUsed: number;
  totalRpdRemaining: number;
  rpdUsagePercent: number;
  healthStatus: "healthy" | "degraded" | "critical";
  isChaosOutage?: boolean;
}

export interface HealthMetrics {
  activeKeysCount: number;
  totalKeysCount: number;
  healthMetricsCount: number;
  providerStats: Record<string, { totalKeys: number; activeKeys: number }>;
  providerCapacity?: ProviderCapacityMetric[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  gatewayTokenId: string | null;
  projectLabel: string | null;
  modelRequested: string;
  modelUsed: string | null;
  keyId: string | null;
  latencyMs: number | null;
  statusCode: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  body?: {
    prompt: unknown;
    response: unknown;
  } | null;
}

/** Payload live telemetry dari SSE `/internal/stream` (event "metrics"). */
export interface TelemetrySnapshot {
  status?: string;
  rps?: number;
  latency?: number;
  cpuUsage?: number;
}

/** Satu titik data grafik latensi/error di `/internal/analytics/timeseries`. */
export interface TimeseriesPoint {
  time: string;
  avgLatencyMs: number;
  errorCount: number;
  totalRequests: number;
}

/** Satu baris leaderboard model dari `/internal/leaderboard`. */
export interface LeaderboardEntry {
  modelId: string;
  providerId: string;
  avgLatencyMs: number | null;
  successRate: number | null;
  score: number | null;
}

/** Satu baris audit log admin dari `/internal/audit-logs`. */
export interface AuditLogEntry {
  id: string;
  action: string;
  targetId?: string | null;
  timestamp: string;
}

/** Hasil auto-discovery LLM lokal dari `/api/internal/discover`. */
export interface DiscoveryResult {
  discoveredCount: number;
  provider?: { baseUrl?: string };
  models?: Array<{ id: string }>;
}

/** Aturan canary A/B routing aktif dari `/internal/config` (routing tab). */
export interface CanaryRule {
  canaryWeight: number;
  mainModel: string;
  canaryModel: string;
}
