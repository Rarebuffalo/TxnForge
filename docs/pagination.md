# Cursor-Based Pagination

Pagination is critical for handling large datasets efficiently. We use cursor-based pagination rather than offset-based pagination to ensure high performance and prevent data duplicate/skip errors.

## Why Cursor Over Offset?

### Offset Pagination (`LIMIT 10 OFFSET 1000`)
- **Performance**: As the offset increases, the database must scan through all previous records (1000) and discard them. This results in `O(N)` query speeds, which degrade significantly over millions of rows.
- **Inconsistencies**: If a transaction is inserted or deleted while a user is paginating, items shift. The user will see duplicate items or skip records entirely.

### Cursor Pagination (`WHERE id > cursor LIMIT 10`)
- **Performance**: Uses index lookups to jump directly to the cursor position, resulting in `O(log N)` query speeds regardless of page depth.
- **Inconsistencies**: The pointer remains fixed on the specific record ID, preventing duplicate or skipped records when items are added or deleted.

## Implementation Details

Our API query uses the Prisma cursor pagination syntax:

```typescript
const limit = parseInt(query.limit || "10", 10);
const cursor = query.cursor; // Last transaction ID from previous page

const transactions = await prisma.transaction.findMany({
  take: limit + 1, // Fetch limit + 1 to check if there is a next page
  where: {
    organizationId: orgId,
  },
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0, // Skip the cursor element itself
  orderBy: {
    date: "desc",
  },
});
```

### Next Cursor Resolution
By fetching `limit + 1` elements:
- If the returned length equals `limit + 1`, we pop the last item and extract its `id` as `nextCursor`.
- If the returned length is less than or equal to `limit`, it means we have reached the end of the history. We set `nextCursor` to `null`.
- The frontend client stores this `nextCursor` and passes it back in the subsequent fetch request.
