# Multi-Tenancy & Data Isolation

Multi-tenancy allows multiple customer units (organizations) to operate independently on the same software instance and database, ensuring complete separation of sensitive financial data.

## Isolation Strategies

We implement a two-layered isolation framework:

1. **Application-Layer Filtration**: Resolving tenant IDs in middleware and appending explicit `WHERE` clauses to queries.
2. **Database-Layer Row-Level Security (RLS)**: Enforcing tenant limits inside the PostgreSQL engine itself, acting as a fallback if application code is modified.

```
       +---------------------------------------------+
       |           Hono API Middleware               |
       |  - Validates session member workspace       |
       |  - Injects orgId into request context       |
       +---------------------------------------------+
                              |
                              v  Prisma transaction
       +---------------------------------------------+
       |            PostgreSQL Transaction           |
       |  1. SET LOCAL app.current_org_id = 'org-A'; |
       |  2. SELECT * FROM transaction;              |
       +---------------------------------------------+
                              |
                              v  RLS Policy check
       +---------------------------------------------+
       |         PostgreSQL Storage Engine           |
       |  Filters rows using tenant isolation policy |
       +---------------------------------------------+
```

## Row-Level Security (RLS) Configuration

### 1. Enable RLS on Table
Row-level security must be explicitly enabled on the target table:
```sql
ALTER TABLE transaction ENABLE ROW LEVEL SECURITY;
```

### 2. Define Tenant Policy
We create a policy that checks every transaction row before allowing read or write operations:
```sql
CREATE POLICY tenant_isolation_policy ON transaction
  USING (organization_id = current_setting('app.current_org_id', true));
```

### 3. Bind Session Context in Code
When a request is processed, the backend binds the active organization ID inside a local database transaction. Prisma executes this block sequentially:
```typescript
await prisma.$transaction(async (tx) => {
  // Bind the current organization context parameter.
  await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${orgId}';`);

  // Subsequent queries are restricted by the RLS policy.
  return await tx.transaction.findMany({
    where: { organizationId: orgId }
  });
});
```

If a developer accidentally forgets to include a `where: { organizationId }` clause in the Prisma query, the PostgreSQL storage engine will still intercept the query and return only rows matching `app.current_org_id`, preventing tenant data leaks.
