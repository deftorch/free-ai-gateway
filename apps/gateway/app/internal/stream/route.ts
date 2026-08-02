import { verifyInternalAdminToken } from "@free-ai-gateway/core";
import os from "os";

export const runtime = "nodejs";

/**
 * GET /internal/stream
 * Endpoint Server-Sent Events (SSE) untuk menyiarkan metrik real-time ke Dashboard.
 * Menghilangkan kebutuhan polling HTTP.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || req.headers.get("authorization");

  if (!verifyInternalAdminToken(token)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Fungsi untuk mengirim data
      const sendData = (event: string, data: unknown) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          // Stream tertutup
        }
      };

      // Siarkan pesan pertama (Koneksi Sukses)
      sendData("connected", { message: "Real-time Telemetry Active" });

      // Loop pengiriman metrik setiap 1 detik
      const intervalId = setInterval(() => {
        // Ambil CPU Load (rata-rata 1 menit, skala 0-100%)
        const cpuCpus = os.cpus();
        const loadAvg = os.loadavg()[0]; // 1 minute load avg
        const cpuUsage = Math.min(100, Math.round((loadAvg / cpuCpus.length) * 100));
        
        // Memori yang digunakan dalam persen
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const memUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);

        // Simulasi RPS sementara (Bisa disambungkan dengan memory store sungguhan)
        // RPS diambil secara acak antara 5 - 50 untuk demo
        const rps = Math.round(5 + Math.random() * 45);
        
        // Latency diambil secara acak antara 150 - 400
        const latency = Math.round(150 + Math.random() * 250);

        const metrics = {
          status: "healthy",
          uptime: process.uptime(),
          cpuUsage,
          memUsage,
          rps,
          latency
        };

        sendData("metrics", metrics);
      }, 1000); // Update tiap 1 detik

      // Membersihkan interval jika klien terputus
      req.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        try { controller.close(); } catch (e) {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      // Penting: Cegah buffering oleh reverse proxy (seperti Nginx/Vercel)
      "X-Accel-Buffering": "no",
    },
  });
}
