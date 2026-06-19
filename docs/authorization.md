# Authorization Flow

Authorization determines whether an authenticated identity is permitted to access or modify a specific resource. In this system, authorization is managed using Better Auth organization memberships and context middleware.

## Request Authorization Sequence

1. **Bearer Token Check**: The request passes through `authMiddleware` which resolves the session user.
2. **Workspace Association**: The middleware queries the database to confirm whether the resolved user is a member of the requested organization workspace.
3. **Context Binding**: If membership is verified, the user and organization IDs are bound to the Hono request context. If not, the request is rejected or isolated to the user's default workspace.
4. **Data Filtration**: The route handler uses the context organization ID to restrict database queries, preventing data exposure.

## Authentication vs. Authorization

Understanding the difference is critical for maintaining security:

- **Authentication (AuthN)**: Answers the question **"Who are you?"**. It identifies the user by verifying their credentials (email and password). The result of successful authentication is a valid user session.
- **Authorization (AuthZ)**: Answers the question **"What are you allowed to do?"**. It checks if the authenticated user has the necessary rights (e.g., membership in the organization workspace) to interact with the target transactions.

Even if a user is successfully authenticated, they will be blocked from viewing transactions belonging to another organization because they lack authorization.
