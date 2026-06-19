import { MiddlewareHandler } from "hono";
import { AuthContext } from "./auth.js";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store for tracking request counts per client.
const limitMap = new Map<string, RateLimitRecord>();

/**
 * Custom rate limiter middleware.
 * Restricts the number of requests a user (or IP address) can make within a specified time window.
 */
export const rateLimiter = (options: { windowMs: number; max: number }): MiddlewareHandler => {
  return async (c, next) => {
    // Attempt to identify the client: use authenticated user ID if present, otherwise fallback to IP address.
    let clientId = "";
    
    // Retrieve authentication context if available.
    const authContext = c.get("auth") as AuthContext | undefined;
    if (authContext?.user?.id) {
      clientId = authContext.user.id;
    } else {
      clientId = c.req.header("x-forwarded-for") || "unknown-ip";
    }

    const now = Date.now();
    const record = limitMap.get(clientId);

    if (!record) {
      // First request in the current window. Initialize record.
      limitMap.set(clientId, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      await next();
      return;
    }

    if (now > record.resetTime) {
      // The previous time window has expired. Reset tracking.
      record.count = 1;
      record.resetTime = now + options.windowMs;
      await next();
      return;
    }

    // Increment request count within the active window.
    record.count++;

    if (record.count > options.max) {
      // Rate limit exceeded.
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      c.header("Retry-After", retryAfterSeconds.toString());
      return c.json(
        { error: "Too many requests. Please try again later." },
        429
      );
    }

    await next();
  };
};
