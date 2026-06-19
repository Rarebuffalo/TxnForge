import { Hono } from "hono";
import { transactionRouter } from "../src/routes/transactions.js";
import { auth } from "../src/lib/auth.js";
import { prisma } from "../src/lib/prisma.js";

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
    aliceUserId = alice.user.id;

    // Sign in Alice to create a database session and retrieve a valid session token.
    const aliceSignIn = await auth.api.signInEmail({
      body: {
        email: alice.user.email,
        password: "password123",
      },
    });
    aliceToken = aliceSignIn.token || "";

    // Manually provision Alice's organization and membership.
    const aliceOrg = await prisma.organization.create({
      data: {
        name: "Alice's Workspace",
        slug: `alice-workspace-${Date.now()}`,
      },
    });
    await prisma.member.create({
      data: {
        role: "owner",
        userId: aliceUserId,
        organizationId: aliceOrg.id,
      },
    });

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
    bobUserId = bob.user.id;

    // Sign in Bob to create a database session and retrieve a valid session token.
    const bobSignIn = await auth.api.signInEmail({
      body: {
        email: bob.user.email,
        password: "password123",
      },
    });
    bobToken = bobSignIn.token || "";

    // Manually provision Bob's organization and membership.
    const bobOrg = await prisma.organization.create({
      data: {
        name: "Bob's Workspace",
        slug: `bob-workspace-${Date.now()}`,
      },
    });
    await prisma.member.create({
      data: {
        role: "owner",
        userId: bobUserId,
        organizationId: bobOrg.id,
      },
    });

    // Resolve Bob's organization.
    const bobMember = await prisma.member.findFirst({
      where: { userId: bobUserId },
    });
    bobOrgId = bobMember!.organizationId;
  });

  afterAll(async () => {
    // Cleanup.
    await prisma.transaction.deleteMany({
      where: {
        userId: { in: [aliceUserId, bobUserId] },
      },
    });
    await prisma.member.deleteMany({
      where: {
        userId: { in: [aliceUserId, bobUserId] },
      },
    });
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
    
    const insertRes = await app.request("http://localhost:8000/api/transactions/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${aliceToken}`,
        "Cookie": `better-auth.session_token=${aliceToken}`,
      },
      body: JSON.stringify({ text: rawText }),
    });

    expect(insertRes.status).toBe(201);
    const insertBody = await insertRes.json() as any;
    expect(insertBody.data.organizationId).toBe(aliceOrgId);

    // List Alice's transactions.
    const listRes = await app.request("http://localhost:8000/api/transactions", {
      headers: {
        Authorization: `Bearer ${aliceToken}`,
        Cookie: `better-auth.session_token=${aliceToken}`,
      },
    });

    expect(listRes.status).toBe(200);
    const listBody = await listRes.json() as any;
    expect(listBody.data.length).toBeGreaterThan(0);
    expect(listBody.data[0].organizationId).toBe(aliceOrgId);
  });

  test("Bob cannot see Alice's transactions", async () => {
    // List Bob's transactions. Should be empty because Bob hasn't inserted anything.
    const listRes = await app.request("http://localhost:8000/api/transactions", {
      headers: {
        Authorization: `Bearer ${bobToken}`,
        Cookie: `better-auth.session_token=${bobToken}`,
      },
    });

    expect(listRes.status).toBe(200);
    const listBody = await listRes.json() as any;
    expect(listBody.data.length).toBe(0); // bobOrgId is empty
  });

  test("Alice trying to inject Bob's Org ID in header is isolated", async () => {
    // Alice requests Bob's org. The middleware should check membership.
    const listRes = await app.request("http://localhost:8000/api/transactions", {
      headers: {
        "Authorization": `Bearer ${aliceToken}`,
        "Cookie": `better-auth.session_token=${aliceToken}`,
        "x-organization-id": bobOrgId, // Inject Bob's org ID
      },
    });

    // Our middleware checks organization membership. If Alice is not a member of Bob's Org,
    // it falls back to Alice's default membership workspace (aliceOrgId).
    // Thus she only gets her own transactions, not Bob's.
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json() as any;
    expect(listBody.data.length).toBeGreaterThan(0);
    expect(listBody.data[0].organizationId).toBe(aliceOrgId); // Yields Alice's, not Bob's.
  });
});
