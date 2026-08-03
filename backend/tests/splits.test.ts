import { Hono } from "hono";
import { transactionRouter } from "../src/routes/transactions.js";
import { auth } from "../src/lib/auth.js";
import { prisma } from "../src/lib/prisma.js";

const app = new Hono();
app.route("/api/transactions", transactionRouter);

describe("Transaction Splits API Tests", () => {
  let aliceToken = "";
  let bobToken = "";
  let aliceOrgId = "";
  let bobOrgId = "";
  let aliceUserId = "";
  let bobUserId = "";
  let charlieUserId = "";
  let transactionId = "";

  beforeAll(async () => {
    // 1. Create Alice
    const alice = await auth.api.signUpEmail({
      body: {
        email: `alice-split-${Date.now()}@example.com`,
        password: "password123",
        name: "Alice Split",
      },
    });
    aliceUserId = alice.user.id;

    const aliceSignIn = await auth.api.signInEmail({
      body: {
        email: alice.user.email,
        password: "password123",
      },
    });
    aliceToken = aliceSignIn.token || "";

    // Provision Alice's org
    const aliceOrg = await prisma.organization.create({
      data: {
        name: "Alice Split Workspace",
        slug: `alice-split-workspace-${Date.now()}`,
      },
    });
    aliceOrgId = aliceOrg.id;

    await prisma.member.create({
      data: {
        role: "owner",
        userId: aliceUserId,
        organizationId: aliceOrgId,
      },
    });

    // 2. Create Charlie and add to Alice's workspace
    const charlie = await auth.api.signUpEmail({
      body: {
        email: `charlie-split-${Date.now()}@example.com`,
        password: "password123",
        name: "Charlie Split",
      },
    });
    charlieUserId = charlie.user.id;

    await prisma.member.create({
      data: {
        role: "member",
        userId: charlieUserId,
        organizationId: aliceOrgId,
      },
    });

    // 3. Create Bob (belongs to his own separate org)
    const bob = await auth.api.signUpEmail({
      body: {
        email: `bob-split-${Date.now()}@example.com`,
        password: "password123",
        name: "Bob Split",
      },
    });
    bobUserId = bob.user.id;

    const bobSignIn = await auth.api.signInEmail({
      body: {
        email: bob.user.email,
        password: "password123",
      },
    });
    bobToken = bobSignIn.token || "";

    const bobOrg = await prisma.organization.create({
      data: {
        name: "Bob Split Workspace",
        slug: `bob-split-workspace-${Date.now()}`,
      },
    });
    bobOrgId = bobOrg.id;

    await prisma.member.create({
      data: {
        role: "owner",
        userId: bobUserId,
        organizationId: bobOrgId,
      },
    });

    // 4. Extract/create a transaction for Alice
    const rawText = "Date: 12 Dec 2025\nDescription: Dinner with friends\nAmount: -3000.00\nBalance: 5000.00";
    const extractRes = await app.request("http://localhost:8000/api/transactions/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${aliceToken}`,
        "Cookie": `better-auth.session_token=${aliceToken}`,
      },
      body: JSON.stringify({ text: rawText }),
    });

    expect(extractRes.status).toBe(201);
    const extractBody = await extractRes.json() as any;
    transactionId = extractBody.data.id;
  });

  afterAll(async () => {
    // Cleanup splits, transactions, members, sessions, accounts, and users
    await prisma.transactionSplit.deleteMany({
      where: {
        transactionId: transactionId,
      },
    });
    await prisma.transaction.deleteMany({
      where: {
        userId: { in: [aliceUserId, bobUserId, charlieUserId] },
      },
    });
    await prisma.member.deleteMany({
      where: {
        userId: { in: [aliceUserId, bobUserId, charlieUserId] },
      },
    });
    await prisma.session.deleteMany({
      where: {
        userId: { in: [aliceUserId, bobUserId, charlieUserId] },
      },
    });
    await prisma.account.deleteMany({
      where: {
        userId: { in: [aliceUserId, bobUserId, charlieUserId] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [aliceUserId, bobUserId, charlieUserId] },
      },
    });
    await prisma.organization.deleteMany({
      where: {
        id: { in: [aliceOrgId, bobOrgId] },
      },
    });
    await prisma.$disconnect();
  });

  test("GET /members returns all users in Alice's organization", async () => {
    const res = await app.request("http://localhost:8000/api/transactions/members", {
      headers: {
        Authorization: `Bearer ${aliceToken}`,
        Cookie: `better-auth.session_token=${aliceToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data).toBeDefined();
    expect(body.data.length).toBe(2);

    const emails = body.data.map((u: any) => u.email);
    expect(emails).toContainEqual(expect.stringContaining("alice-split"));
    expect(emails).toContainEqual(expect.stringContaining("charlie-split"));
  });

  test("POST /:id/split fails if percentages do not sum to 100", async () => {
    const res = await app.request(`http://localhost:8000/api/transactions/${transactionId}/split`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${aliceToken}`,
        "Cookie": `better-auth.session_token=${aliceToken}`,
      },
      body: JSON.stringify({
        splits: [
          { userId: aliceUserId, percentage: 40 },
          { userId: charlieUserId, percentage: 50 },
        ],
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toContain("must equal exactly 100%");
  });

  test("POST /:id/split fails if user is not in the active organization", async () => {
    const res = await app.request(`http://localhost:8000/api/transactions/${transactionId}/split`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${aliceToken}`,
        "Cookie": `better-auth.session_token=${aliceToken}`,
      },
      body: JSON.stringify({
        splits: [
          { userId: aliceUserId, percentage: 50 },
          { userId: bobUserId, percentage: 50 }, // Bob is in a different org
        ],
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toContain("is not a member of the current organization");
  });

  test("POST /:id/split succeeds with valid members and percentages summing to 100", async () => {
    const res = await app.request(`http://localhost:8000/api/transactions/${transactionId}/split`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${aliceToken}`,
        "Cookie": `better-auth.session_token=${aliceToken}`,
      },
      body: JSON.stringify({
        splits: [
          { userId: aliceUserId, percentage: 60 },
          { userId: charlieUserId, percentage: 40 },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.message).toContain("successfully");

    // Check GET /:id/splits to verify persistence
    const getRes = await app.request(`http://localhost:8000/api/transactions/${transactionId}/splits`, {
      headers: {
        Authorization: `Bearer ${aliceToken}`,
        Cookie: `better-auth.session_token=${aliceToken}`,
      },
    });

    expect(getRes.status).toBe(200);
    const getBody = await getRes.json() as any;
    expect(getBody.data.length).toBe(2);

    const firstSplit = getBody.data.find((s: any) => s.userId === aliceUserId);
    expect(firstSplit.percentage).toBe(60);

    const secondSplit = getBody.data.find((s: any) => s.userId === charlieUserId);
    expect(secondSplit.percentage).toBe(40);
  });

  test("Bob cannot access Alice's transaction split endpoint", async () => {
    const res = await app.request(`http://localhost:8000/api/transactions/${transactionId}/split`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${bobToken}`,
        "Cookie": `better-auth.session_token=${bobToken}`,
      },
      body: JSON.stringify({
        splits: [
          { userId: bobUserId, percentage: 100 },
        ],
      }),
    });

    // Due to RLS or logic check, it should reject because it's not Bob's transaction
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toContain("not found or access denied");
  });
});
