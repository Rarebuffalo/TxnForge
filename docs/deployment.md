# Deployment Guide

This decoupled application is designed for cloud environments, separating the static Next.js frontend client from the persistent Node.js/PostgreSQL backend API.

## Recommended Services

- **Frontend Client**: Vercel (Next.js native integration)
- **Backend API Server**: Railway / Render
- **Database Store**: Railway PostgreSQL (native support for connection strings and migrations)

## Deployment Steps

### 1. Database Provisioning (Railway)
1. Log in to Railway and create a new project.
2. Select **Provision PostgreSQL**.
3. Under variables, copy the generated connection string (`DATABASE_URL`).
4. Execute SQL migrations to initialize the database:
   ```bash
   npx prisma db push
   ```
5. Apply the Postgres RLS migration by running `01_enable_rls.sql` against the database using a database client or query tool.

### 2. Backend API Server (Railway)
1. Add a new service from your GitHub repository.
2. Select the `/backend` subdirectory as the root.
3. Configure the following environment variables:
   - `PORT`: `8000` (or leave default if managed by Railway)
   - `DATABASE_URL`: Set to the PostgreSQL connection string.
   - `BETTER_AUTH_SECRET`: Generate a secure random string.
   - `BETTER_AUTH_URL`: The public URL of the backend (e.g. `https://your-api.railway.app`).
   - `FRONTEND_URL`: The public URL of the Next.js client.
4. Deploy the service.

### 3. Frontend Client (Vercel)
1. Create a new project in Vercel.
2. Select the repository and set the root directory to `frontend`.
3. Configure the public environment variable:
   - `NEXT_PUBLIC_API_URL`: Set to your deployed Hono backend API URL (e.g., `https://your-api.railway.app`).
4. Set the framework preset to **Next.js**.
5. Deploy.
