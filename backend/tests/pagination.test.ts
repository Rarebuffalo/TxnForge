import { Hono } from "hono";
import { transactionRouter } from "../src/routes/transactions.js";
import { auth } from "../src/lib/auth.js";
import { prisma } from "../src/lib/prisma.js";

const app = new Hono();
app.route("/api/transactions", transactionRouter);

describe("Cursor-Based Pagination Tests", () => {
  let token = "";
  let orgId = "";
  let userId = "";
  const createdTxnIds: string[] = [];

  beforeAll(async () => {
    const user = await auth.api.signUpEmail({
      body: {
        email: `pager-${Date.now()}@example.com`,
        password: "password123",
        name: "Pager",
      },
    });
    userId = user.user.id;

    // Sign in to create a database session and retrieve a valid session token.
    const signInResult = await auth.api.signInEmail({
      body: {
        email: user.user.email,
        password: "password123",
      },
    });
    token = signInResult.token || "";

    // Manually provision organization and member record for the test user.
    const defaultOrg = await prisma.organization.create({
      data: {
        name: "Pager's Workspace",
        slug: `pager-workspace-${Date.now()}`,
      },
    });
    await prisma.member.create({
      data: {
        role: "owner",
        userId: userId,
        organizationId: defaultOrg.id,
      },
    });

    const member = await prisma.member.findFirst({
      where: { userId },
    });
    orgId = member!.organizationId;

    // Insert 12 transactions directly to test pagination
    for (let i = 1; i <= 12; i++) {
      const txn = await prisma.transaction.create({
        data: {
          date: new Date(2025, 11, i), // 1st Dec to 12th Dec
          description: `Test Transaction #${i}`,
          amount: -100 * i,
          balance: 10000 - 100 * i,
          rawText: `Fake text for index ${i}`,
          confidence: 1.0,
          userId,
          organizationId: orgId,
        },
      });
      createdTxnIds.push(txn.id);
    }
  });

  afterAll(async () => {
    // Cleanup.
    await prisma.transaction.deleteMany({
      where: { userId },
    });
    await prisma.member.deleteMany({
      where: { userId },
    });
    await prisma.user.delete({
      where: { id: userId },
    });
    await prisma.organization.delete({
      where: { id: orgId },
    });
    await prisma.$disconnect();
  });

  test("Fetch page 1 - Should return limit transactions and a nextCursor", async () => {
    const limit = 5;
    const res = await app.request(`http://localhost:8000/api/transactions?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `better-auth.session_token=${token}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.length).toBe(limit);
    expect(body.nextCursor).not.toBeNull();
    
    // Test that the items are sorted descending by date (transaction #12 should be first)
    expect(body.data[0].description).toBe("Test Transaction #12");
  });

  test("Fetch page 2 - Using nextCursor from page 1", async () => {
    // Fetch Page 1
    const limit = 5;
    const page1Res = await app.request(`http://localhost:8000/api/transactions?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `better-auth.session_token=${token}`,
      },
    });
    const page1Body = await page1Res.json() as any;
    const cursor = page1Body.nextCursor;

    // Fetch Page 2
    const page2Res = await app.request(`http://localhost:8000/api/transactions?limit=${limit}&cursor=${cursor}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `better-auth.session_token=${token}`,
      },
    });

    expect(page2Res.status).toBe(200);
    const page2Body = await page2Res.json() as any;
    expect(page2Body.data.length).toBe(limit);
    expect(page2Body.nextCursor).not.toBeNull();
    expect(page2Body.data[0].description).toBe("Test Transaction #7");
  });

  test("Fetch final page - Should yield remaining transactions and nextCursor as null", async () => {
    const limit = 10;
    const page1Res = await app.request(`http://localhost:8000/api/transactions?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `better-auth.session_token=${token}`,
      },
    });
    const page1Body = await page1Res.json() as any;
    const cursor = page1Body.nextCursor;

    // Fetch Page 2 (limit 10) -> returns remaining 2 items (Transaction #2, #1)
    const page2Res = await app.request(`http://localhost:8000/api/transactions?limit=${limit}&cursor=${cursor}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `better-auth.session_token=${token}`,
      },
    });

    expect(page2Res.status).toBe(200);
    const page2Body = await page2Res.json() as any;
    expect(page2Body.data.length).toBe(2);
    expect(page2Body.nextCursor).toBeNull(); // No more items left
    expect(page2Body.data[0].description).toBe("Test Transaction #2");
    expect(page2Body.data[1].description).toBe("Test Transaction #1");
  });
});
