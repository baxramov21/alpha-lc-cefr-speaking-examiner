/**
 * A simple in-memory rate limiter using a Map.
 * Suitable for a single-instance Next.js deployment.
 */
class InMemoryRateLimiter {
  private cache = new Map<string, number[]>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowSeconds: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
  }

  limit(ip: string): Promise<{ success: boolean }> {
    const now = Date.now();
    const timestamps = this.cache.get(ip) || [];
    
    // Remove timestamps older than the window
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
    
    if (validTimestamps.length >= this.maxRequests) {
      return Promise.resolve({ success: false });
    }
    
    validTimestamps.push(now);
    this.cache.set(ip, validTimestamps);
    
    // Cleanup cache periodically to prevent memory leaks
    if (this.cache.size > 10000) {
      const cleanupTime = now - this.windowMs;
      for (const [key, times] of this.cache.entries()) {
        const valid = times.filter(ts => ts > cleanupTime);
        if (valid.length === 0) {
          this.cache.delete(key);
        } else {
          this.cache.set(key, valid);
        }
      }
    }

    return Promise.resolve({ success: true });
  }
}

// 30 requests per 60 seconds per IP — for AI evaluate endpoints (allows 8 progressive questions + 1 aggregate per student)
export const apiRateLimiter = new InMemoryRateLimiter(30, 60);

// 5 attempts per 15 minutes per IP — for admin login
export const loginRateLimiter = new InMemoryRateLimiter(5, 15 * 60);
