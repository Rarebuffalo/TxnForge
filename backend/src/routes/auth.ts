import { Hono } from "hono";
import { auth } from "../lib/auth.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const authRouter = new Hono();

/**
 * Handles user registration. 
 * Creates a User using Better Auth, provisions a workspace, and returns session data.
 */
authRouter.post("/register", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    // Call Better Auth to register the user.
    const user = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: name || email.split("@")[0],
      },
    });

    if (!user) {
      return c.json({ error: "Failed to create user" }, 400);
    }

    // Automatically provision a default workspace organization.
    const defaultOrgName = `${user.user.name || user.user.email.split("@")[0]}'s Workspace`;
    const slug = `${user.user.email.split("@")[0]}-workspace-${Date.now()}`;

    const organization = await prisma.organization.create({
      data: {
        name: defaultOrgName,
        slug: slug,
      },
    });

    // Create the member record associating the user as owner of the workspace.
    await prisma.member.create({
      data: {
        role: "owner",
        userId: user.user.id,
        organizationId: organization.id,
      },
    });

    return c.json({
      message: "Registration successful",
      user: user.user,
      token: user.token,
    }, 201);
  } catch (error: any) {
    console.error("Registration endpoint error:", error);
    return c.json({ error: error.message || "Internal Server Error during registration" }, 500);
  }
});

/**
 * Handles user login. 
 * Authenticates user credentials via Better Auth and returns session data.
 */
authRouter.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    // Call Better Auth to sign in and generate the session.
    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    if (!result) {
      return c.json({ error: "Invalid credentials" }, 400);
    }

    return c.json({
      message: "Login successful",
      user: result.user,
      token: result.token,
    }, 200);
  } catch (error: any) {
    console.error("Login endpoint error:", error);
    return c.json({ error: error.message || "Invalid credentials or login failure" }, 401);
  }
});
