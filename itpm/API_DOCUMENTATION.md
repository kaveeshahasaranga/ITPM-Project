# HostelMate API Documentation

## Base URL
`http://localhost:4000/api`

## Authentication
Most endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 🔐 Authentication Endpoints

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "admin@hostelmate.local",
  "password": "Admin@123"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "123",
    "name": "Hostel Admin",
    "email": "admin@hostelmate.local",
    "role": "admin"
  }
}
```

**Error Responses:**
- `400` - Invalid input
- `401` - Invalid credentials
- `403` - Account awaiting approval
- `429` - Too many login attempts (rate limit: 5 per 15 minutes)

---

### POST /auth/register
Register a new student account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone": "0771234567",
  "emergencyContact": {
    "name": "Jane Doe",
    "phone": "0779876543"
  }
}
```

**Success Response (201):**
```json
{
  "id": "456",
  "message": "Registration successful. Awaiting admin approval."
}
```

**Error Responses:**
- `400` - Validation errors
- `409` - Email already registered

---

## 👥 User Endpoints

### GET /users/me
Get current user profile (requires authentication).

**Success Response (200):**
```json
{
  "id": "123",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "student",
  "status": "approved",
  "phone": "0771234567",
  "createdAt": "2026-01-15T10:00:00.000Z"
}
```

---

## 🔧 Maintenance Endpoints

### GET /maintenance
Get all maintenance requests (students see only theirs, admins see all).

**Success Response (200):**
```json
[
  {
    "id": "789",
    "studentId": "456",
    "category": "Water",
    "description": "Leaking pipe in bathroom",
    "status": "Pending",
    "createdAt": "2026-02-01T14:30:00.000Z"
  }
]
```

### POST /maintenance
Create a new maintenance request.

**Request Body:**
```json
{
  "category": "Water",
  "description": "Leaking pipe in bathroom",
  "urgency": "high"
}
```

---

## 📋 Booking Endpoints

### GET /bookings
Get all resource bookings.

### POST /bookings
Create a new booking.

**Request Body:**
```json
{
  "resourceId": "resource123",
  "resourceName": "Conference Room",
  "start": "2026-02-05T10:00:00.000Z",
  "end": "2026-02-05T12:00:00.000Z"
}
```

---

## 🛡️ Admin Endpoints

### GET /admin/students
Get all students (admin only).

### PATCH /admin/students/:id/approve
Approve a pending student account (admin only).

### PATCH /admin/students/:id/reject
Reject a pending student account (admin only).

---

## 🔒 Security Features

- **Helmet.js**: Security headers
- **Rate Limiting**: 
  - Auth endpoints: 5 requests per 15 minutes
  - API endpoints: 100 requests per minute
- **Input Sanitization**: Automatic trimming of string inputs
- **CORS**: Enabled for cross-origin requests
- **JWT**: 7-day expiration

---

## 📊 Response Format

### Success Response
```json
{
  "data": {...},
  "message": "Success"
}
```

### Error Response
```json
{
  "message": "Error description",
  "status": 400
}
```

---

## 🚀 Rate Limits

| Endpoint | Limit |
|----------|-------|
| /auth/login | 5 requests / 15 min |
| /auth/register | 5 requests / 15 min |
| /api/* (general) | 100 requests / min |

---

## 📝 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Server Error
