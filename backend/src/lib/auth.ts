import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins/organization";
import { rateLimit } from "better-auth/plugins/rate-limit";
import { PrismaClient } from "@prisma/client";

// Initialize the Prisma Client instance.
const prisma = new PrismaClient();

// Configure the Better Auth instance with database adapter and plugins.
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  
  // Enable email and password authentication.
  emailAndPassword: {
    enabled: true,
  },
  
  // Set up plugins for multi-tenancy and rate limiting.
  plugins: [
    // Organization plugin enables teams/workspace isolation.
    organization({
      // We will keep standard settings. Membership and roles are managed here.
      creatorRole: "owner",
    }),
    
    // Rate limit plugin protects auth and API endpoints from abuse.
    rateLimit({
      window: 60, // Time window in seconds.
      max: 100,  // Max requests allowed per window.
    }),
  ],
});
