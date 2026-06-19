# Better Auth Integration

Better Auth handles credentials validation and session records in our application. Both the backend Hono API and frontend Next.js application coordinate through its server-client architecture.

## Configuration Details

### Prisma Adapter
Better Auth connects directly to the PostgreSQL database through the `prismaAdapter`. It maps its internal data models (User, Session, Account, Verification) directly to the Prisma schema.

### Organization Plugin
To enable multi-tenancy workspace isolation, the `organization` plugin is registered on the server. This plugin adds three database models:
- **Organization**: Represents the tenant workspace.
- **Member**: Maps users to organizations with specific roles (e.g., "owner", "admin", "member").
- **Invitation**: Enables inviting external users to join a workspace.

### Rate Limit Plugin
The `rateLimit` plugin is enabled on the server to prevent brute-force attacks and abuse. It tracks request volume per user identity over a 60-second window, rejecting requests that exceed 100 queries.

## Frontend to Backend Sync

Rather than duplicate session storage, the Next.js client uses `@better-auth/react` to communicate with the Hono server:

1. **Session Hooks**: The frontend calls `authClient.useSession()` to retrieve active user credentials, status, and tokens.
2. **Cookie Handling**: Better Auth handles cross-domain session cookies. For requests to protected routes, the frontend client includes the token in the headers:
   ```typescript
   headers: {
     "Authorization": `Bearer ${token}`
   }
   ```
3. **Synchronization**: The backend middleware intercepts the header, calls `auth.api.getSession()`, and resolves the active user and workspace state.
