import { db } from "@free-ai-gateway/database";
import { models } from "@free-ai-gateway/database";
import { clickhouse } from "@free-ai-gateway/database";
import { verifyInternalAdminToken } from "@free-ai-gateway/core";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /internal/leaderboard
 * Menghitung ranking model gratis berdasarkan kecepatan (avg latency), success rate, dan overall score.
 * Diperbarui untuk menggunakan ClickHouse sebagai sumber metrics.
 */
/** Baris mentah metrik ClickHouse (format JSONEachRow — angka bisa string). */
interface RawLeaderboardMetric {
  modelUsed: string;
  avgLatencyMs: string | number;
  totalProbes: string | number;
  successRate: string | number;
}

export async function GET(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    let catalog: Array<typeof models.$inferSelect> = [];
    let rawMetrics: RawLeaderboardMetric[] = [];
    
    // 1. Ambil Katalog Model Aktif dari Postgres
    try {
      catalog = await db.select().from(models).where(eq(models.status, "active"));
    } catch (e) {
      console.error("Postgres catalog fetch error:", e);
    }

    // 2. Ambil Metrik Latensi & Error Rate dari ClickHouse
    try {
      const query = `
        SELECT 
            modelUsed,
            avg(latencyMs) AS avgLatencyMs,
            count() AS totalProbes,
            (sum(if(statusCode < 400, 1, 0)) * 100.0 / count()) AS successRate
        FROM gateway_request_logs
        WHERE timestamp >= now() - INTERVAL 24 HOUR
        GROUP BY modelUsed
      `;
      const resultSet = await clickhouse.query({ query, format: "JSONEachRow" });
      rawMetrics = await resultSet.json();
    } catch (e) {
      console.error("ClickHouse leaderboard metrics error:", e);
    }

    // Normalisasi format modelUsed "provider/model" menjadi "model" jika perlu
    // Tapi karena tabel model menggunakan id unik (misal "gpt-4"), kita cocokkan sedekat mungkin.
    const metricsMap = new Map<string, RawLeaderboardMetric>();
    rawMetrics.forEach((m) => {
        // modelUsed di logs biasanya format: 'groq/llama3-8b' atau 'llama3-8b'
        // Kita parse model name-nya.
        const parts = String(m.modelUsed).split("/");
        const pureModelName = parts.length > 1 ? parts[1] : parts[0];
        
        metricsMap.set(pureModelName, m);
        // Set original key juga
        metricsMap.set(m.modelUsed, m);
    });

    const leaderboard = catalog.map((m) => {
      // Coba cari dari nama exact atau dari provider/id
      const stats = metricsMap.get(m.id) || metricsMap.get(`${m.providerId}/${m.id}`);
      
      const avgLatencyMs = stats ? Math.round(Number(stats.avgLatencyMs) || 0) : null;
      const successRate = stats ? Math.round(Number(stats.successRate) || 0) : null;
      
      let score = null;
      if (avgLatencyMs !== null && successRate !== null) {
        const latencyScore = Math.max(0, 100 - avgLatencyMs / 20); // 1000ms = 50 score
        score = Math.round(successRate * 0.7 + latencyScore * 0.3);
      }

      return {
        modelId: m.id,
        displayName: m.displayName,
        providerId: m.providerId,
        avgLatencyMs,
        successRate,
        score,
        tags: m.tags || [],
      };
    });

    // Urutkan berdasarkan score tertinggi, yang null di akhir
    leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0));

    return Response.json({ leaderboard });
  } catch (error) {
    return Response.json({ leaderboard: [] }, { status: 200 });
  }
}
