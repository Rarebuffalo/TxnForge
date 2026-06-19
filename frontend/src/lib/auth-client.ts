import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

// Initialize the Better Auth React client pointing to our Hono backend API.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  plugins: [
    // Register organization client plugin for multi-tenancy state.
    organizationClient(),
  ],
});
