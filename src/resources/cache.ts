/**
 * Minimal in-memory TTL cache for MCP resources (ROADMAP P1.5).
 *
 * Metadata, type lists, and views change rarely; caching them server-side
 * means repeated resource reads don't re-hit the upstream API.
 */

export const DEFAULT_TTL_MS = 15 * 60 * 1000;

interface Entry {
  value: string;
  expires: number;
}

const store = new Map<string, Entry>();

export async function cached(
  key: string,
  fn: () => Promise<string>,
  ttlMs: number = DEFAULT_TTL_MS,
  now: () => number = Date.now
): Promise<string> {
  const hit = store.get(key);
  if (hit && hit.expires > now()) return hit.value;
  const value = await fn();
  store.set(key, { value, expires: now() + ttlMs });
  return value;
}

export function clearCache(): void {
  store.clear();
}
