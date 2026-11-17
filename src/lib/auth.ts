// Single-user password gate. Works in both the proxy and the Node.js runtime (Web Crypto only).
export const AUTH_COOKIE = "et_auth";

export function authEnabled() {
  return Boolean(process.env.APP_PASSWORD);
}

export async function expectedToken() {
  const secret = process.env.AUTH_SECRET || process.env.APP_PASSWORD || "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`exercise-tracker:${process.env.APP_PASSWORD}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isValidToken(token: string | undefined) {
  if (!authEnabled()) return process.env.NODE_ENV !== "production";
  if (!token) return false;
  const expected = await expectedToken();
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
