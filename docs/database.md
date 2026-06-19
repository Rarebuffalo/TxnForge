# Database Schema & Design

This system uses a relational schema designed around PostgreSQL. Prisma ORM handles model compilation and migrations.

## Entity Relationship Model

```
+---------------+         +---------------+
|     User      |         | Session/Acct  |
| - id (PK)     |1       1| - id (PK)     |
| - email       |-------->| - userId (FK) |
+---------------+         +---------------+
        |1
        |
        |*
+---------------+         +----------------------+
|    Member     |         |     Organization     |
| - id (PK)     |*       1| - id (PK)            |
| - userId (FK) |<--------| - slug (unique)      |
+---------------+         +----------------------+
                                    |1
                                    |
                                    |*
                          +----------------------+
                          |     Transaction      |
                          | - id (PK)            |
                          | - orgId (FK)         |
                          | - userId (FK)        |
                          +----------------------+
```

## Model Relationships

- **User & Sessions**: A User can have multiple active Session records (e.g., active on both a desktop and a mobile device).
- **User & Members**: The Member table acts as a join table mapping Users to Organizations. A User can be a Member of multiple Organizations, and an Organization can contain multiple Members.
- **Organization & Transactions**: A Transaction belongs to a single Organization. This establishes our primary tenant isolation boundary.
- **User & Transactions**: A Transaction maps back to the specific User who parsed and uploaded it, providing audit capability.

## Schema Optimizations

### Decimal Precision
To avoid floating-point errors (e.g., representation issues like `0.1 + 0.2 = 0.300000000004`), transaction `amount` and `balance` are stored as Postgres `Decimal(12, 2)`. This supports values up to 9,999,999,999.99 with exact cent precision.

### Indexes
To ensure fast queries as the database grows, we define the following indexes:
- `@@index([organizationId, date])`: Accelerates listing transactions sorted by date.
- `@@index([organizationId, createdAt])`: Accelerates cursor-based paging lookups.
- `@@index([userId, createdAt])`: Optimizes user-level audit queries.
