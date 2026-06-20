import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins/organization";
import { prisma } from "./prisma.js";

// Configure the Better Auth instance with database adapter and plugins.
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  
  // Allow cross-origin requests from frontend client URL
  trustedOrigins: [
    "http://localhost:3000",
    "https://*.vercel.app",
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
  ],
  
  // Enable email and password authentication.
  emailAndPassword: {
    enabled: true,
  },
  
  // Set up plugins for multi-tenancy.
  plugins: [
    // Organization plugin enables teams/workspace isolation.
    organization({
      // We will keep standard settings. Membership and roles are managed here.
      creatorRole: "owner",
    }),
  ],
});
