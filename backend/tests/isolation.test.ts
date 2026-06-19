import request from "supertest";
import { Hono } from "hono";
import { transactionRouter } from "../src/routes/transactions.js";
import { PrismaClient } from "@prisma/client";
import { auth } from "../src/lib/auth.js";

const prisma = new PrismaClient();
const app = new Hono();
app.route("/api/transactions", transactionRouter);

describe("Multi-Tenant Data Isolation Tests", () => {
  let aliceToken = "";
  let bobToken = "";
  let aliceOrgId = "";
  let bobOrgId = "";
  let aliceUserId = "";
  let bobUserId = "";

  beforeAll(async () => {
    // 1. Create Alice credentials and get session token
    const alice = await auth.api.signUpEmail({
      body: {
        email: `alice-${Date.now()}@example.com`,
        password: "password123",
        name: "Alice",
      },
    });
    aliceToken = alice.session.token;
    aliceUserId = alice.user.id;

    // Resolve Alice's organization.
    const aliceMember = await prisma.member.findFirst({
      where: { userId: aliceUserId },
    });
    aliceOrgId = aliceMember!.organizationId;

    // 2. Create Bob credentials and get session token
    const bob = await auth.api.signUpEmail({
      body: {
        email: `bob-${Date.now()}@example.com`,
        password: "password123",
        name: "Bob",
      },
    });
    bobToken = bob.session.token;
    bobUserId = bob.user.id;

    // Resolve Bob's organization.
    const bobMember = await prisma.member.findFirst({
      where: { userId: bobUserId },
    });
    bobOrgId = bobMember!.organizationId;
  });

  afterAll(async () => {
    // Cleanup.
    await prisma.user.deleteMany({
      where: {
        id: { in: [aliceUserId, bobUserId] },
      },
    });
    await prisma.organization.deleteMany({
      where: {
        id: { in: [aliceOrgId, bobOrgId] },
      },
    });
    await prisma.$disconnect();
  });

  test("Alice can insert transactions and see them", async () => {
    const rawText = "Date: 11 Dec 2025\nDescription: STARBUCKS COFFEE\nAmount: -420.00\nBalance after transaction: 18,420.50";
    
    const insertRes = await request(app.fetch)
      .post("/api/transactions/extract")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ text: rawText });

    expect(insertRes.status).toBe(201);
    expect(insertRes.body.data.organizationId).toBe(aliceOrgId);

    // List Alice's transactions.
    const listRes = await request(app.fetch)
      .get("/api/transactions")
      .set("Authorization", `Bearer ${aliceToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
    expect(listRes.body.data[0].organizationId).toBe(aliceOrgId);
  });

  test("Bob cannot see Alice's transactions", async () => {
    // List Bob's transactions. Should be empty because Bob hasn't inserted anything.
    const listRes = await request(app.fetch)
      .get("/api/transactions")
      .set("Authorization", `Bearer ${bobToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(0); // bobOrgId is empty
  });

  test("Alice trying to inject Bob's Org ID in header is isolated", async () => {
    // Alice requests Bob's org. The middleware should check membership.
    // Since Alice is not a member of Bob's org, the query must fail or fallback to Alice's own data.
    const listRes = await request(app.fetch)
      .get("/api/transactions")
      .set("Authorization", `Bearer ${aliceToken}`)
      .set("x-organization-id", bobOrgId); // Inject Bob's org ID

    // Our middleware checks organization membership. If Alice is not a member of Bob's Org,
    // it falls back to Alice's default membership workspace (aliceOrgId).
    // Thus she only gets her own transactions, not Bob's.
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
    expect(listRes.body.data[0].organizationId).toBe(aliceOrgId); // Yields Alice's, not Bob's.
  });
});
