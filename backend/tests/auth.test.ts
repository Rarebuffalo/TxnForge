import request from "supertest";
import { Hono } from "hono";
import { authRouter } from "../src/routes/auth.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = new Hono();
app.route("/api/auth", authRouter);

describe("Authentication & Workspace Provisioning Tests", () => {
  const testEmail = `user-${Date.now()}@example.com`;
  const testPassword = "securePassword123";

  // Clean up database records after tests.
  afterAll(async () => {
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    if (user) {
      await prisma.user.delete({
        where: { id: user.id },
      });
    }
    await prisma.$disconnect();
  });

  test("POST /api/auth/register - Should register user and auto-provision organization", async () => {
    const res = await request(app.fetch)
      .post("/api/auth/register")
      .send({
        email: testEmail,
        password: testPassword,
        name: "Test User",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body).toHaveProperty("session");

    // Assert that the default organization was created in the database.
    const org = await prisma.organization.findFirst({
      where: {
        members: {
          some: {
            userId: res.body.user.id,
          },
        },
      },
    });

    expect(org).not.toBeNull();
    expect(org?.name).toBe("Test User's Workspace");
  });

  test("POST /api/auth/login - Should authenticate registered user", async () => {
    const res = await request(app.fetch)
      .post("/api/auth/login")
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body).toHaveProperty("session");
  });

  test("POST /api/auth/login - Should fail with incorrect credentials", async () => {
    const res = await request(app.fetch)
      .post("/api/auth/login")
      .send({
        email: testEmail,
        password: "wrongPassword",
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });
});
