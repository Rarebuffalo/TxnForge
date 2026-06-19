import request from "supertest";
import { Hono } from "hono";
import { transactionRouter } from "../src/routes/transactions.js";
import { PrismaClient } from "@prisma/client";
import { auth } from "../src/lib/auth.js";

const prisma = new PrismaClient();
const app = new Hono();
app.route("/api/transactions", transactionRouter);

describe("Cursor-Based Pagination Tests", () => {
  let token = "";
  let orgId = "";
  let userId = "";
  const createdTxnIds: string[] = [];

  beforeAll(async () => {
    // Create test user and organization
    const user = await auth.api.signUpEmail({
      body: {
        email: `pager-${Date.now()}@example.com`,
        password: "password123",
        name: "Pager",
      },
    });
    token = user.session.token;
    userId = user.user.id;

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
    const res = await request(app.fetch)
      .get(`/api/transactions?limit=${limit}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(limit);
    expect(res.body.nextCursor).not.toBeNull();
    
    // Test that the items are sorted descending by date (transaction #12 should be first)
    expect(res.body.data[0].description).toBe("Test Transaction #12");
  });

  test("Fetch page 2 - Using nextCursor from page 1", async () => {
    // Fetch Page 1
    const limit = 5;
    const page1Res = await request(app.fetch)
      .get(`/api/transactions?limit=${limit}`)
      .set("Authorization", `Bearer ${token}`);
    
    const cursor = page1Res.body.nextCursor;

    // Fetch Page 2
    const page2Res = await request(app.fetch)
      .get(`/api/transactions?limit=${limit}&cursor=${cursor}`)
      .set("Authorization", `Bearer ${token}`);

    expect(page2Res.status).toBe(200);
    expect(page2Res.body.data.length).toBe(limit);
    expect(page2Res.body.nextCursor).not.toBeNull();
    // The first element of Page 2 should be the next element after the cursor (Transaction #6)
    // Page 1: #12, #11, #10, #9, #8. The cursor is #8.
    // Page 2: #7, #6, #5, #4, #3. The next cursor is #3.
    expect(page2Res.body.data[0].description).toBe("Test Transaction #7");
  });

  test("Fetch final page - Should yield remaining transactions and nextCursor as null", async () => {
    // Fetch Page 1 (limit 10) -> returns 10 items, cursor is transaction #3
    const limit = 10;
    const page1Res = await request(app.fetch)
      .get(`/api/transactions?limit=${limit}`)
      .set("Authorization", `Bearer ${token}`);

    const cursor = page1Res.body.nextCursor;

    // Fetch Page 2 (limit 10) -> returns remaining 2 items (Transaction #2, #1)
    const page2Res = await request(app.fetch)
      .get(`/api/transactions?limit=${limit}&cursor=${cursor}`)
      .set("Authorization", `Bearer ${token}`);

    expect(page2Res.status).toBe(200);
    expect(page2Res.body.data.length).toBe(2);
    expect(page2Res.body.nextCursor).toBeNull(); // No more items left
    expect(page2Res.body.data[0].description).toBe("Test Transaction #2");
    expect(page2Res.body.data[1].description).toBe("Test Transaction #1");
  });
});
