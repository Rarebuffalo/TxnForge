# Transactions Service

The transaction service processes financial ledger uploads and list views. It is mounted at `/api/transactions` and protected by `authMiddleware`.

## Endpoints

### 1. Extract Transaction
- **Method**: `POST`
- **Path**: `/api/transactions/extract`
- **Headers**:
  - `Authorization: Bearer <session_token>`
  - `Content-Type: application/json`
- **Request Payload**:
  ```json
  {
    "text": "Date: 11 Dec 2025\nDescription: STARBUCKS COFFEE\nAmount: -420.00\nBalance after transaction: 18,420.50"
  }
  ```
- **Response Payload (201 Created)**:
  ```json
  {
    "message": "Transaction extracted and saved successfully",
    "data": {
      "id": "e30e6765-a83a-4efb-86d7-fc67ccb5c464",
      "date": "2025-12-11T00:00:00.000Z",
      "description": "STARBUCKS COFFEE",
      "amount": "-420.00",
      "balance": "18420.50",
      "category": "Food/Beverage",
      "rawText": "Date: 11 Dec 2025\nDescription: STARBUCKS COFFEE...",
      "confidence": 1.0,
      "userId": "d74e8921-2ef3-4bc7-bd92-91ef2c0282bf",
      "organizationId": "a908bc12-f12b-4fa8-bc73-d1f27cb281ef",
      "createdAt": "2026-06-19T12:00:00.000Z",
      "updatedAt": "2026-06-19T12:00:00.000Z"
    }
  }
  ```

### 2. List Transactions
- **Method**: `GET`
- **Path**: `/api/transactions`
- **Headers**:
  - `Authorization: Bearer <session_token>`
- **Query Parameters**:
  - `limit` (optional): Number of records (default `10`).
  - `cursor` (optional): Transaction ID string acting as paging offset.
- **Response Payload (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "e30e6765-a83a-4efb-86d7-fc67ccb5c464",
        "date": "2025-12-11T00:00:00.000Z",
        "description": "STARBUCKS COFFEE",
        "amount": "-420.00",
        "balance": "18420.50",
        "category": "Food/Beverage",
        "confidence": 1.0,
        "organizationId": "a908bc12-f12b-4fa8-bc73-d1f27cb281ef"
      }
    ],
    "nextCursor": "e30e6765-a83a-4efb-86d7-fc67ccb5c464"
  }
  ```

## Request Pipeline Execution

```
[POST /extract Request]
          |
          v
  [authMiddleware]
  - Resolves Bearer token
  - Verifies workspace membership
  - Sets context: user, organization, member
          |
          v
  [Parser Engine]
  - Extract properties
  - Calculate confidence
          |
          v
  [Database Isolation (RLS)]
  - SET LOCAL app.current_org_id = organizationId
  - Save transaction in Postgres
          |
          v
  [JSON Response (201)]
```
