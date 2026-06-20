import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { auth } from "./lib/auth.js";
import { authRouter } from "./routes/auth.js";
import { transactionRouter } from "./routes/transactions.js";
import { rateLimiter } from "./middleware/rate-limit.js";
import dotenv from "dotenv";

// Load configuration environment variables.
dotenv.config();

const app = new Hono();

// Apply rate limiter to all API endpoints (100 requests per minute).
app.use(
  "/api/*",
  rateLimiter({
    windowMs: 60 * 1000,
    max: 100,
  })
);

// Enable Cross-Origin Resource Sharing (CORS) for Next.js frontend communication.
app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow localhost and vercel preview/production domains dynamically
      if (
        origin === "http://localhost:3000" ||
        origin.endsWith(".vercel.app") ||
        (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)
      ) {
        return origin;
      }
      return process.env.FRONTEND_URL || "http://localhost:3000";
    },
    allowHeaders: ["Content-Type", "Authorization", "x-organization-id"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    credentials: true,
  })
);

// Expose standard Better Auth routes.
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Register routes for custom assignment auth endpoints.
app.route("/api/auth", authRouter);

// Register routes for protected financial transaction extractions.
app.route("/api/transactions", transactionRouter);

// Handle base URL request check.
app.get("/", (c) => {
  return c.text("Vessify Transaction Extractor API running successfully");
});

// Configure the port and start the node server.
const port = parseInt(process.env.PORT || "8000", 10);
console.log(`Starting server on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});
