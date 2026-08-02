import { clickhouse } from "@free-ai-gateway/database";
import { verifyInternalAdminToken } from "@free-ai-gateway/core";

export const runtime = "nodejs";

/**
 * GET /internal/analytics/timeseries
 * Mengembalikan agregasi tren latensi & error rate per interval 1 jam dalam 24 jam terakhir dari ClickHouse.
 */
/** Baris mentah hasil query ClickHouse (format JSONEachRow) — angka bisa
 * datang sebagai string tergantung tipe kolom, makanya field numerik di sini
 * dilonggarkan ke `string | number` dan di-`Number()`-kan lagi di bawah. */
interface RawTimeseriesRow {
  hour: string;
  avgLatencyMs: string | number;
  totalRequests: string | number;
  errorCount: string | number;
}

export async function GET(req: Request) {
  if (!verifyInternalAdminToken(req.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    let timeSeriesData: RawTimeseriesRow[] = [];
    try {
      const query = `
        SELECT 
            toStartOfHour(timestamp) AS hour, 
            avg(latencyMs) AS avgLatencyMs, 
            count() AS totalRequests, 
            sum(if(statusCode >= 400, 1, 0)) AS errorCount 
        FROM gateway_request_logs 
        WHERE timestamp >= now() - INTERVAL 24 HOUR 
        GROUP BY hour 
        ORDER BY hour ASC
      `;
      const resultSet = await clickhouse.query({ query, format: "JSONEachRow" });
      timeSeriesData = await resultSet.json();
    } catch (e) {
        console.error("ClickHouse query error (falling back to dummy data):", e);
    }

    const points = timeSeriesData.map((d) => {
      const dateStr = d.hour.replace(' ', 'T') + 'Z'; 
      const dateObj = new Date(dateStr);
      return {
        time: dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        avgLatencyMs: Math.round(Number(d.avgLatencyMs) || 0),
        totalRequests: Number(d.totalRequests) || 0,
        errorCount: Number(d.errorCount) || 0,
      }
    });

    return Response.json({ points });
  } catch (error) {
    return Response.json({ points: [] }, { status: 200 });
  }
}
