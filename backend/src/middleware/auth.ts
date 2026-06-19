import { MiddlewareHandler } from "hono";
import { auth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

// Unified authentication and authorization context structure.
export interface AuthContext {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  member: {
    id: string;
    role: string;
  };
}

/**
 * Hono middleware that verifies the user's session and binds the 
 * user, organization, and membership context to the request.
 */
export const authMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    try {
      // 1. Extract session token from Authorization header or Cookie.
      let token = "";
      const authHeader = c.req.header("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      } else {
        const cookieHeader = c.req.header("Cookie") || c.req.header("cookie") || "";
        const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
        if (match) {
          token = match[1];
        }
      }

      let sessionUser = null;

      // Direct database resolution for token verification (critical for testing/isolation reliability).
      if (token) {
        const dbSession = await prisma.session.findFirst({
          where: { token },
          include: { user: true },
        });

        if (dbSession && dbSession.expiresAt > new Date()) {
          sessionUser = dbSession.user;
        }
      }

      // 2. Fallback to Better Auth API getSession if direct database lookup is not matched.
      if (!sessionUser) {
        const session = await auth.api.getSession({
          headers: c.req.raw.headers,
        });
        if (session && session.user) {
          sessionUser = session.user;
        }
      }

      if (!sessionUser) {
        return c.json({ error: "Unauthorized: Invalid or missing session" }, 401);
      }

      // Identify the target organization. 
      // First check for a client-specified header, else default to the user's first organization membership.
      const requestedOrgId = c.req.header("x-organization-id");

      let memberRecord = null;
      if (requestedOrgId) {
        memberRecord = await prisma.member.findFirst({
          where: {
            userId: sessionUser.id,
            organizationId: requestedOrgId,
          },
          include: {
            organization: true,
          },
        });
      }

      // If invalid or not specified, fall back to the user's first organization membership
      if (!memberRecord) {
        memberRecord = await prisma.member.findFirst({
          where: {
            userId: sessionUser.id,
          },
          include: {
            organization: true,
          },
        });
      }

      // If the user has no organization memberships, provision a default workspace.
      if (!memberRecord) {
        const defaultOrgName = `${sessionUser.name || sessionUser.email.split("@")[0]}'s Workspace`;
        const slug = `${sessionUser.email.split("@")[0]}-workspace-${Date.now()}`;

        // Create the organization and associate the user as the owner.
        const newOrg = await prisma.organization.create({
          data: {
            name: defaultOrgName,
            slug: slug,
          },
        });

        const newMember = await prisma.member.create({
          data: {
            role: "owner",
            userId: sessionUser.id,
            organizationId: newOrg.id,
          },
          include: {
            organization: true,
          },
        });

        memberRecord = newMember;
      }

      // Inject the unified auth context into the Hono request context.
      c.set("auth", {
        user: {
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.name || undefined,
        },
        organization: {
          id: memberRecord.organization.id,
          name: memberRecord.organization.name,
          slug: memberRecord.organization.slug,
        },
        member: {
          id: memberRecord.id,
          role: memberRecord.role,
        },
      });

      await next();
    } catch (error) {
      console.error("Authentication middleware error:", error);
      return c.json({ error: "Internal Server Error during authentication" }, 500);
    }
  };
};
