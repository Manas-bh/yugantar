/**
 * In-memory token denylist for invalidated JWT tokens.
 * Tokens are stored with their expiration time and automatically cleaned up.
 * 
 * For production at scale, this should be backed by Redis or a database.
 */

const denylist = new Map<string, number>(); // token hash → expiry timestamp

// Cleanup interval: every 10 minutes, remove expired entries
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanupScheduled() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, expiry] of denylist) {
      if (expiry <= now) {
        denylist.delete(key);
      }
    }
    // Stop interval if denylist is empty
    if (denylist.size === 0 && cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  }, 10 * 60 * 1000);
}

/**
 * Create a short hash of the token to use as a key (saves memory).
 */
function tokenKey(token: string): string {
  // Use the last 32 chars of the token as a unique identifier
  return token.slice(-32);
}

/**
 * Add a token to the denylist. It will be automatically removed after 7 days
 * (matching the JWT expiration time).
 */
export async function addToTokenDenylist(token: string): Promise<void> {
  const key = tokenKey(token);
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  denylist.set(key, expiresAt);
  ensureCleanupScheduled();
}

/**
 * Check if a token has been denied (invalidated via logout).
 */
export function isTokenDenied(token: string): boolean {
  const key = tokenKey(token);
  const expiry = denylist.get(key);
  if (expiry === undefined) return false;
  if (expiry <= Date.now()) {
    denylist.delete(key);
    return false;
  }
  return true;
}
