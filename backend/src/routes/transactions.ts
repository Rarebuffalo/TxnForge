import { Hono } from "hono";
import { PrismaClient, Prisma } from "@prisma/client";
import { authMiddleware, AuthContext } from "../middleware/auth.js";
import { parseTransaction } from "../lib/parser.js";

const prisma = new PrismaClient();
export const transactionRouter = new Hono<{ Variables: { auth: AuthContext } }>();

// Protect all transaction endpoints with the auth context middleware.
transactionRouter.use("*", authMiddleware());

/**
 * POST /extract
 * Receives bank statement text, extracts fields, and records the transaction.
 */
transactionRouter.post("/extract", async (c) => {
  try {
    const { text } = await c.req.json();
    const authContext = c.get("auth") as AuthContext;

    if (!text || typeof text !== "string") {
      return c.json({ error: "Invalid text input: 'text' string is required" }, 400);
    }

    // Invoke the modular parser to extract key structured attributes.
    const parsed = parseTransaction(text);

    // Save transaction inside a Prisma transaction block to apply Postgres RLS.
    const savedTransaction = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Set the session context variable for database Row-Level Security (RLS).
      await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${authContext.organization.id}';`);

      return await tx.transaction.create({
        data: {
          date: parsed.date || new Date(),
          description: parsed.description || "Parsed Transaction",
          amount: parsed.amount !== null ? parsed.amount : 0,
          balance: parsed.balance,
          category: parsed.category,
          rawText: text,
          confidence: parsed.confidence,
          userId: authContext.user.id,
          organizationId: authContext.organization.id,
        },
      });
    });

    return c.json({
      message: "Transaction extracted and saved successfully",
      data: savedTransaction,
    }, 201);
  } catch (error: any) {
    console.error("Extraction endpoint error:", error);
    return c.json({ error: error.message || "Internal Server Error during extraction" }, 500);
  }
});

/**
 * GET /
 * Returns the authenticated user's organization-scoped transactions with cursor-based pagination.
 */
transactionRouter.get("/", async (c) => {
  try {
    const authContext = c.get("auth") as AuthContext;
    
    // Parse pagination parameters.
    const limit = parseInt(c.req.query("limit") || "10", 10);
    const cursor = c.req.query("cursor");

    // Fetch transactions inside a database transaction to apply local RLS constraints.
    const transactions = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Set the local session context to isolate queries at database layer.
      await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${authContext.organization.id}';`);

      return await tx.transaction.findMany({
        take: limit + 1, // Fetch one extra record to evaluate next page cursor.
        where: {
          organizationId: authContext.organization.id, // Application-layer filter.
        },
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0, // Avoid repeating the cursor record.
        orderBy: {
          date: "desc",
        },
      });
    });

    // Check if there is a next page and format the response.
    let nextCursor: string | null = null;
    if (transactions.length > limit) {
      const nextItem = transactions.pop(); // Remove the extra peek element.
      nextCursor = nextItem?.id || null;
    }

    return c.json({
      data: transactions,
      nextCursor,
    }, 200);
  } catch (error: any) {
    console.error("List transactions endpoint error:", error);
    return c.json({ error: error.message || "Internal Server Error loading transactions" }, 500);
  }
});
