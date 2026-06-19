# API Endpoint Reference

This reference details the backend Hono REST API contract.

## 1. Authentication Endpoints

### Register User
- **HTTP Method**: `POST`
- **Path**: `/api/auth/register`
- **Request Headers**:
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123",
    "name": "Krishna"
  }
  ```
- **Response Headers**:
  - `Content-Type: application/json`
- **Response Body (201 Created)**:
  ```json
  {
    "message": "Registration successful",
    "user": {
      "id": "e30e6765-a83a-4efb-86d7-fc67ccb5c464",
      "email": "user@example.com",
      "name": "Krishna",
      "createdAt": "2026-06-19T12:00:00.000Z"
    },
    "session": {
      "id": "s8921-2ef3-4bc7",
      "token": "session_token_uuid",
      "expiresAt": "2026-06-26T12:00:00.000Z"
    }
  }
  ```

### User Login
- **HTTP Method**: `POST`
- **Path**: `/api/auth/login`
- **Request Headers**:
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123"
  }
  ```
- **Response Body (200 OK)**:
  ```json
  {
    "message": "Login successful",
    "user": {
      "id": "e30e6765-a83a-4efb-86d7-fc67ccb5c464",
      "email": "user@example.com",
      "name": "Krishna"
    },
    "session": {
      "token": "session_token_uuid"
    }
  }
  ```

---

## 2. Transaction Endpoints

### Extract Transaction
- **HTTP Method**: `POST`
- **Path**: `/api/transactions/extract`
- **Request Headers**:
  - `Authorization: Bearer <session_token>`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "text": "Uber Ride * Airport Drop\n12/11/2025 → ₹1,250.00 debited\nAvailable Balance → ₹17,170.50"
  }
  ```
- **Response Body (201 Created)**:
  ```json
  {
    "message": "Transaction extracted and saved successfully",
    "data": {
      "id": "txn_uuid",
      "date": "2025-12-11T00:00:00.000Z",
      "description": "Uber Ride * Airport Drop",
      "amount": "-1250.00",
      "balance": "17170.50",
      "category": "Travel",
      "confidence": 1.0,
      "organizationId": "org_uuid"
    }
  }
  ```

### List Transactions
- **HTTP Method**: `GET`
- **Path**: `/api/transactions`
- **Request Headers**:
  - `Authorization: Bearer <session_token>`
- **Query Parameters**:
  - `limit` (optional): Items to fetch (default `10`).
  - `cursor` (optional): ID from which pagination offsets.
- **Response Body (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "txn_uuid",
        "date": "2025-12-11T00:00:00.000Z",
        "description": "Uber Ride * Airport Drop",
        "amount": "-1250.00",
        "balance": "17170.50",
        "category": "Travel",
        "confidence": 1.0
      }
    ],
    "nextCursor": "txn_uuid"
  }
  ```
