import { MiddlewareHandler } from "hono";
import { auth } from "../lib/auth.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
      // Retrieve user session using Better Auth from the request headers.
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (!session || !session.user) {
        return c.json({ error: "Unauthorized: Invalid or missing session" }, 401);
      }

      // Identify the target organization. 
      // First check for a client-specified header, else default to the user's first organization membership.
      const requestedOrgId = c.req.header("x-organization-id");

      let memberRecord = null;
      if (requestedOrgId) {
        memberRecord = await prisma.member.findFirst({
          where: {
            userId: session.user.id,
            organizationId: requestedOrgId,
          },
          include: {
            organization: true,
          },
        });
      } else {
        memberRecord = await prisma.member.findFirst({
          where: {
            userId: session.user.id,
          },
          include: {
            organization: true,
          },
        });
      }

      // If the user has no organization memberships, provision a default workspace.
      if (!memberRecord) {
        const defaultOrgName = `${session.user.name || session.user.email.split("@")[0]}'s Workspace`;
        const slug = `${session.user.email.split("@")[0]}-workspace-${Date.now()}`;

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
            userId: session.user.id,
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
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
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
