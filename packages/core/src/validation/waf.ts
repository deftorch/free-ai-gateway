import { kv, kvKeys } from "../kv/client";

// Daftar IP atau subnet statis yang diblokir selamanya
const STATIC_IP_BLOCKLIST = new Set([
  "192.168.1.254", // Contoh IP statis
  // Tambahkan IP bot jahat atau scraper nakal di sini
]);

// Daftar negara yang terkena embargo atau diblokir (menggunakan format kode negara 2 huruf standar cloudflare/vercel)
const BLOCKED_COUNTRIES = new Set([
  "NK", // North Korea
  "SY", // Syria
  // "RU",
]);

export interface WAFResult {
  allowed: boolean;
  reason?: string;
  code?: number;
}

/**
 * Menganalisis kueri dari sisi jaringan (IP, Geo, dan Reputation)
 * Mengembalikan objek WAFResult.
 */
export async function analyzeNetworkWAF(ip: string, countryCode?: string): Promise<WAFResult> {
  // 1. Static IP Blocklist Check
  if (STATIC_IP_BLOCKLIST.has(ip)) {
    return { allowed: false, reason: "IP Address is permanently blocked by WAF policy.", code: 403 };
  }

  // 2. Geo-Blocking Check
  if (countryCode && BLOCKED_COUNTRIES.has(countryCode.toUpperCase())) {
    return { allowed: false, reason: "Access from your region is restricted by WAF policy.", code: 403 };
  }

  // 3. Dynamic IP Reputation Check (via Upstash Redis)
  // Misalnya, IP yang melakukan DDoS akan dimasukkan ke key `waf:blocked_ip:{ip}`
  try {
    const isDynamicBlocked = await kv.get(`waf:blocked_ip:${ip}`);
    if (isDynamicBlocked) {
      return { allowed: false, reason: "IP Address is temporarily blocked due to malicious activity.", code: 403 };
    }
  } catch (e) {
    // Fail-open strategy jika KV error, agar sistem tidak mati jika redis bermasalah
  }

  return { allowed: true };
}
