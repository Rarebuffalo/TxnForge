# Authentication Flow

Authentication verifies the identity of users attempting to connect to the platform. We use Better Auth's Email and Password provider to manage credentials, hash passwords, and track sessions.

## Execution Flow

```
[Client App]                              [Hono Backend]
     |                                          |
     |--- POST /api/auth/login ---------------->|
     |    (email, password)                     |
     |                                          |
     |                                    [Better Auth]
     |                                    - Verify user email
     |                                    - Verify password hash
     |                                    - Create session record
     |                                          |
     |<-- Set-Cookie: session_token ------------|
     |    (or Bearer token)                     |
```

### User Registration
1. User provides name, email, and password on `/register`.
2. The frontend sends a signup payload to `POST /api/auth/register`.
3. Better Auth hashes the password using its cryptographically secure hashing functions and stores the new user in the database.
4. On success, the backend provisions a default workspace and returns a session token.

### User Login
1. User enters email and password on `/login`.
2. The credentials are sent to `POST /api/auth/login`.
3. Better Auth validates the credentials against the hashed record in the database.
4. If valid, Better Auth generates a session token with a 7-day expiry and returns it to the client.

### Session Lifecycle
- **Storage**: Better Auth stores session records in the `session` table of the PostgreSQL database, tracking parameters like token hash, expiry, IP address, and user agent.
- **Persistence**: The token is preserved by the client (in cookies or storage). Every subsequent request includes this token in the `Authorization: Bearer <token>` header.
- **Invalidation**: Triggering `authClient.signOut()` tells the Better Auth server to delete the active session from the database, rendering the token invalid.
