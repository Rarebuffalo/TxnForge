# Quality Assurance & Testing

We implement a testing pipeline split into backend unit/integration tests (Jest) and frontend end-to-end user flows (Playwright).

## Test Suite Components

### 1. Parser Unit Tests (`backend/tests/parser.test.ts`)
Validates the parsing engine against the three bank statement samples:
- **Starbucks Sample**: Asserts date parsed to 11 Dec 2025, amount extracted as `-420.00`, balance as `18420.50`, description matched, and confidence is `1.0`.
- **Uber Sample**: Asserts merchant matched as Uber, amount extracted as negative `-1250.00` on the "debited" suffix, and balance matched as `17170.50`.
- **Amazon Sample**: Asserts parsing succeeds on a single-line string with inline balances and categories.

### 2. Authentication Integration Tests (`backend/tests/auth.test.ts`)
- **Signup**: Asserts user is created and a default organization named after the user is automatically provisioned and associated with them.
- **Login**: Asserts valid email and password returns session token, while wrong credentials reject requests with a `401` code.

### 3. Data Isolation Tests (`backend/tests/isolation.test.ts`)
- **Alice vs Bob**: Asserts Alice's transactions are scoped to Alice's organization. Bob queries his own history and receives an empty list.
- **Org Header Injection**: Asserts Alice cannot access Bob's organization's data even if she manually puts Bob's organization ID in the `x-organization-id` header (the middleware falls back to Alice's default membership).

### 4. Pagination Integration Tests (`backend/tests/pagination.test.ts`)
- **Paging Boundaries**: Inserts 12 records, queries page 1 (limit 5) -> verifies it returns 5 items and nextCursor.
- **Paging Continuation**: Queries page 2 using the nextCursor -> verifies items follow correctly.
- **Paging Conclusion**: Queries the final page -> verifies the remaining items are returned and nextCursor is `null`.

### 5. Playwright E2E Tests (`e2e/flow.spec.ts`)
Plays back actual user interactions inside the browser:
1. Registries Alice -> asserts redirection to dashboard and default workspace title.
2. Pastes Starbucks text -> clicks "Parse & Save" -> asserts success toast and row rendering in table.
3. Signs out Alice.
4. Registers Bob -> asserts Bob's workspace table is empty (verifying zero leaks).
5. Bob parses Uber statement -> asserts Uber row appears and Starbucks is not visible.
