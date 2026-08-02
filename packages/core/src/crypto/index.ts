/**
 * Edge-compatible Crypto Module
 */
import { getEnvVar } from "../config/env";

const ALGO = "AES-GCM";
const IV_LENGTH = 12;

function b64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return arr;
}

function uint8ArrayToB64(arr: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < arr.length; i++) {
    bin += String.fromCharCode(arr[i]);
  }
  return btoa(bin);
}

let cachedKey: CryptoKey | null = null;

async function getCryptoKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  
  const secret = getEnvVar("KEY_ENCRYPTION_SECRET");
  if (!secret) {
    throw new Error("KEY_ENCRYPTION_SECRET belum di-set.");
  }
  const rawKey = b64ToUint8Array(secret);
  if (rawKey.length !== 32) {
    throw new Error("KEY_ENCRYPTION_SECRET harus 32 byte (base64-encoded).");
  }
  cachedKey = await (crypto.subtle as any).importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return cachedKey!;
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const encodedPlaintext = new TextEncoder().encode(plaintext);
  const encryptedBuf = await (crypto.subtle as any).encrypt(
    { name: ALGO, iv },
    key,
    encodedPlaintext
  );
  
  const encryptedArr = new Uint8Array(encryptedBuf);
  // WebCrypto appends the 16-byte auth tag to the end of the ciphertext.
  // Match the previous format: base64(iv[12] || authTag[16] || ciphertext).
  const authTag = encryptedArr.slice(-16);
  const ciphertext = encryptedArr.slice(0, -16);
  
  const combined = new Uint8Array(iv.length + authTag.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(authTag, iv.length);
  combined.set(ciphertext, iv.length + authTag.length);
  
  return uint8ArrayToB64(combined);
}

export async function decryptApiKey(ciphertextB64: string): Promise<string> {
  const key = await getCryptoKey();
  const raw = b64ToUint8Array(ciphertextB64);
  
  const iv = raw.slice(0, IV_LENGTH);
  const authTag = raw.slice(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = raw.slice(IV_LENGTH + 16);
  
  const encryptedCombined = new Uint8Array(ciphertext.length + authTag.length);
  encryptedCombined.set(ciphertext, 0);
  encryptedCombined.set(authTag, ciphertext.length);
  
  const decryptedBuf = await (crypto.subtle as any).decrypt(
    { name: ALGO, iv },
    key,
    encryptedCombined
  );
  
  return new TextDecoder().decode(decryptedBuf);
}

export async function hashGatewayToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await (crypto.subtle as any).digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function generateGatewayToken(prefix = "gw"): Promise<{ rawToken: string; tokenHash: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  const rawToken = `${prefix}_${hex}`;
  const tokenHash = await hashGatewayToken(rawToken);
  return { rawToken, tokenHash };
}
