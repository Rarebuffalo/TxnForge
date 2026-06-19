# Transaction Extractor

A secure, multi-tenant personal finance transaction extractor featuring automated statement parsing, weighted confidence scoring, and database-level data isolation. Built with Next.js 15 (App Router), Hono API, Better Auth, and PostgreSQL + Prisma ORM.

## Project Structure

```
.
├── backend/                  # Hono API Server
│   ├── src/
│   │   ├── lib/
│   │   │   ├── auth.ts       # Better Auth Server Config
│   │   │   └── parser.ts     # Modular Parsing Logic
│   │   ├── middleware/
│   │   │   └── auth.ts       # Auth Context Middleware
│   │   ├── routes/
│   │   │   ├── auth.ts       # Auth Wrapper Routes
│   │   │   └── transactions.ts # Protected Transaction Routes
│   │   └── index.ts          # Express-like Hono Entrypoint
│   ├── prisma/
│   │   ├── schema.prisma     # Prisma Data Models
│   │   └── migrations/
│   │       └── 01_enable_rls.sql # Postgres RLS Policies
│   ├── tests/                # Jest Integration Suite
│   └── package.json
│
├── frontend/                 # Next.js 15 App Router Frontend
│   ├── src/
│   │   ├── app/              # Page routes (layout, login, register, dashboard)
│   │   └── lib/
│   │       └── auth-client.ts # Better Auth React Client Config
│   └── package.json
│
├── docs/                     # Comprehensive Architecture & System Docs
│   ├── architecture.md       # Decoupled Stack details
│   ├── authentication.md     # Session & Cookie verification
│   ├── authorization.md      # Access Control & Organization scopes
│   ├── better-auth.md        # Better Auth adapter and plugins
│   ├── database.md           # ER Model & column mappings
│   ├── parser.md             # Modular parsing and matching logic
│   ├── transactions.md       # Transaction processing details
│   ├── multi-tenancy.md      # Workspace separations and RLS
│   ├── pagination.md         # Cursor-based paging logic
│   ├── security.md           # Encryption, CORS, & Injection checks
│   ├── testing.md            # Jest and Playwright specifications
│   ├── deployment.md         # Railway & Vercel deployment guides
│   └── api.md                # JSON schemas and endpoint references
│
└── docker-compose.yml        # Dev PostgreSQL container
```

## Better Auth Isolation & Scalability Approach

Our implementation uses Better Auth's native organization plugin to partition data per tenant (workspace). The auth middleware resolves the user's active session and database membership, dynamically binding user, organization, and role context to the request. This context is used to enforce row-level security (RLS) policies in PostgreSQL alongside application-level filtration, preventing cross-tenant leaks. For scalability, transaction retrieval is optimized using index-backed, cursor-based pagination instead of high-offset queries, preventing shifts and keeping query time constant.

## Getting Started

### Prerequisites
- Node.js (v20 or newer)
- PostgreSQL (v15 or newer)

### Local Database Cluster Management

If you have a local PostgreSQL system installed but do not want to manage it via docker-compose, you can run a local cluster in the workspace root:

1. Initialize database cluster:
   ```bash
   initdb -D ./postgres_local_db
   ```
2. Start the database server binding to port 5432:
   ```bash
   pg_ctl -D ./postgres_local_db -l ./postgres_local_db/logfile -o "-F -p 5432 -k $(pwd)/postgres_local_db" start
   ```
3. Create the database:
   ```bash
   createdb -h $(pwd)/postgres_local_db -p 5432 txnforge
   ```

### Backend Configuration

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and configure environment variables in `.env` (see `.env.example`):
   ```bash
   cp .env.example .env
   ```
3. Run migrations to provision the schema:
   ```bash
   npx prisma db push
   ```
4. Execute the SQL statements in `prisma/migrations/01_enable_rls.sql` against your PostgreSQL database to activate Row-Level Security (RLS) policies.
5. Start the API server:
   ```bash
   npm run dev
   ```

### Frontend Configuration

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Create and configure environment variables in `.env` (see `.env.example`):
   ```bash
   cp .env.example .env
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

### Verification & Testing

To execute the backend Jest suite testing auth endpoints, parser matching, and data isolation logic:
```bash
cd backend
npm run test
```

To run Playwright end-to-end browser workflows:
```bash
npx playwright test
```
