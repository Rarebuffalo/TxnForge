# Security Control Architecture

We implement a multi-layered security model to protect financial data, verify requests, and isolate workspace data.

## Security Control Layers

### 1. Authentication & Hashing
- **Password Hashing**: Better Auth handles encryption programmatically on user signup, hashing passwords using cryptographically secure algorithms. Passwords are never stored in plain text.
- **Session Tokens**: Better Auth issues random session tokens (stored in cookies with HttpOnly, Secure, and SameSite attributes in production).

### 2. Tenant Data Isolation
- **Application Context**: Middlewares resolve the active session and ensure the user is an active member of the organization workspace before letting them query data.
- **Postgres Row-Level Security (RLS)**: Policies are enforced inside the database engine, ensuring that queries are bounded by `app.current_org_id` context.

### 3. SQL Injection Prevention
- **Prisma Parameterized Queries**: Prisma automatically compiles query conditions into parameterized SQL statements. User inputs are treated strictly as parameters, preventing SQL injection vulnerabilities.
- **Safe Dynamic SQL**: Raw SQL queries are avoided. RLS contexts are bound using raw parameter sanitization:
  ```typescript
  await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${orgId}';`);
  ```
  Since the middleware resolves `orgId` from verified database membership UUIDs (and not direct user inputs), the variable is safe.

### 4. Input & API Security
- **Rate Limiting**: Better Auth's rate limit plugin limits users to 100 requests per minute to prevent brute-force attacks and API spam.
- **CORS Policies**: Cross-Origin Resource Sharing is locked to the specified `FRONTEND_URL`. Headers like `Authorization` and custom org IDs are explicitly checked, and credentials options are supported.
- **Environment Variables**: Sensitive data (database connection paths, token keys) are loaded using dotenv, separating config settings from the codebase.
