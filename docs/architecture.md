# System Architecture

This project implements a secure, decoupled personal finance transaction extraction platform. It consists of a frontend client interface and a lightweight API backend.

## Core Stack Components

- **Frontend Client**: Next.js 15 (App Router, Server Components)
- **Backend API**: Hono running on Node.js
- **Database ORM**: Prisma ORM
- **Database Store**: PostgreSQL
- **Security & Session Management**: Better Auth

```
+---------------------------------+
|       Next.js 15 Frontend       |  (Port 3000)
+---------------------------------+
                 |
                 | HTTP / CORS
                 v
+---------------------------------+
|          Hono Backend           |  (Port 8000)
+---------------------------------+
        |                 |
        | Better Auth     | Prisma Client
        v                 v
+---------------------------------+
|           PostgreSQL            |  (Port 5432)
+---------------------------------+
```

## Technical Decisions

### Why Hono
Hono was chosen over alternatives like Express or Fastify because of its zero-dependency footprint, native TypeScript support, and edge-ready execution speeds. It provides lightweight routing, built-in CORS configurations, and straightforward middleware binding, making it suitable for modern API architectures.

### Why Next.js 15
Next.js 15 App Router simplifies React routing, page rendering optimization, and client-server component separations. Using Server Components enables server-side processing, while Client Components handle local page states and input triggers.

### Why Prisma ORM
Prisma provides type-safe query generation, structured migration pipelines, and native TypeScript representation of our database schema. It automatically generates queries that match our custom structures, eliminating manual SQL mapping.

### Why PostgreSQL
PostgreSQL is a robust, production-grade relational database. It supports transaction blocks, indexes, and Row-Level Security (RLS) policies, allowing us to enforce data isolation at the storage engine layer.

### Why Better Auth
Better Auth handles authentication and session storage with minimum custom overhead. It handles credential verification, password hashing, and token tracking, and includes native plugins for organizations (teams) and rate limiting.
