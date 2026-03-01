# Comprehensive Validation Guide

## Overview
This document describes all validation implemented across the ITPM (Integrated Hostel Portal Management) system for backend and frontend.

---

## Backend Validation (Server-side)

### 1. Authentication Routes (`server/src/routes/auth.js`)

#### Register Endpoint
```
POST /auth/register
```
- **Name**: 2-50 chars, letters & spaces only
- **Email**: Valid format, max 100 chars
- **Password**: 6-50 chars, requires uppercase, lowercase, and digit
- **Phone**: Exactly 10 digits
- **Emergency Contact Name**: 2-50 chars, letters & spaces only
- **Emergency Contact Phone**: Exactly 10 digits

#### Login Endpoint
```
POST /auth/login
```
- **Email**: Valid format, max 100 chars
- **Password**: 1-50 chars (allows any characters)

---

### 2. Booking Routes (`server/src/routes/bookings.js`)

#### Create Booking
```
POST /bookings
```
- **Resource Name**: 2-100 chars
- **Start Date**: Valid ISO datetime, cannot be in past
- **End Date**: Valid ISO datetime, must be after start time
- **Duration**: Minimum 15 minutes, maximum 2 hours

**Error Handling**:
- Returns detailed error array with field paths
- Prevents past date bookings
- Checks for time slot conflicts
- Validates resource is active

---

### 3. Visitor Routes (`server/src/routes/visitors.js`)

#### Admin Create Visitor Pass
```
POST /visitors (admin only)
```
- **Visitor Name**: 2-100 chars, letters & spaces only
- **Purpose**: 2-200 chars (optional)
- **Visit Date**: Valid ISO datetime
- **ID Type**: Enum [Aadhar, PAN, License, Passport, Other] (optional)
- **ID Number**: 2-20 chars (optional)
- **Contact**: Exactly 10 digits (optional)
- **Notes**: Max 500 chars (optional)
- **Student Email**: Valid email format (optional)
- **Room Number**: Max 10 chars (optional)

#### Student Request Visitor Pass
```
POST /visitors (student)
```
Same as admin but without email/room fields

---

### 4. Grocery Routes (`server/src/routes/grocery.js`)

#### Create Grocery Request
```
POST /grocery
```
- **Item**: 2-100 chars, alphanumeric only
- **Quantity**: Integer 1-1000
- **Notes**: Max 500 chars (optional)
- **Photos**: Array of valid URLs, max 4 (optional)

#### Create Stock (Admin)
```
POST /grocery/stocks
```
- **Name**: 2-100 chars, alphanumeric only
- **Quantity**: Integer 0-10000
- **Unit**: Enum [pcs, kg, liters, boxes, dozens] (optional)
- **Active**: Boolean (optional, default true)

#### Update Stock (Admin)
```
PATCH /grocery/stocks/:id
```
All fields optional with same validation as create

---

### 5. Announcement Routes (`server/src/routes/announcements.js`)

#### Create Announcement
```
POST /announcements (admin only)
```
- **Message**: 3-1000 chars

---

### 6. Notice Routes (`server/src/routes/notices.js`)

#### Create Notice
```
POST /notices
```
- **Message**: 3-1000 chars

---

### 7. Maintenance Routes (`server/src/routes/maintenance.js`)

#### Create Maintenance Request
```
POST /maintenance
```
- **Category**: Enum [Water, Electricity, Wi-Fi, Furniture]
- **Description**: 5-500 chars

#### Update Maintenance Request
```
PATCH /maintenance/:id
```
Same validation as create (all optional)

#### Update Status (Admin)
```
PATCH /maintenance/:id/status
```
- **Status**: Enum [Pending, In Progress, Completed]
- **Admin Remarks**: Optional text

---

### 8. Todo Routes (`server/src/routes/todos.js`)

#### Create Todo
```
POST /todos
```
- **Title**: 3-100 chars
- **Description**: Max 500 chars (optional)
- **Due Date**: Valid ISO datetime (optional)
- **Priority**: Enum [Low, Medium, High] (optional)

#### Update Todo
```
PATCH /todos/:id
```
- **Status**: Enum [Pending, In Progress, Completed] (optional)
- Same as create for other fields

---

### 9. User Routes (`server/src/routes/users.js`)

#### Update Profile
```
PUT /users/me
```
- **Phone**: Exactly 10 digits
- **Emergency Contact**: Exactly 10 digits
- **Monthly Salary**: 0-999999 (optional)

---

### 10. Expense Routes (`server/src/routes/expenses.js`)

#### Create Expense
```
POST /expenses
```
- **Title**: 2-100 chars
- **Amount**: Positive number, max 999999
- **Category**: 2-50 chars (optional)
- **Date**: Valid ISO datetime (optional)

---

### 11. Resource Routes (`server/src/routes/resources.js`)

#### Create Resource
```
POST /resources (admin only)
```
- **Name**: 2-100 chars

#### Update Resource
```
PATCH /resources/:id (admin only)
```
- **Active**: Boolean

---

### 12. Admin Routes (`server/src/routes/admin.js`)

#### Assign Room
```
PATCH /students/:id/assign-room (admin only)
```
- **Room Number**: 1-10 chars, numeric only
- **Bed Number**: Integer 1-10
- **Bed Count**: Integer 1-10

---

## Frontend Validation (Client-side)

### 1. Login Page (`client/src/pages/Login.jsx`)

**Field-level Validation**:
- **Email**:
  - Required
  - Must match email pattern
  - Max 100 chars
  - Shows inline error on invalid format
  
- **Password**:
  - Required
  - Minimum 6 characters
  - Max 50 chars
  - Shows inline error on invalid length

**Features**:
- Real-time error clearing on input change
- Disabled button during submission
- Error input styling (red border & background)
- Field-level error messages below input
- General error message display

---

### 2. Register Page (`client/src/pages/Register.jsx`)

**Field-level Validation**:
- **Name**:
  - Required
  - 2-50 chars
  - Letters and spaces only
  - Pattern validation with regex
  
- **Email**:
  - Required
  - Valid format
  - Max 100 chars
  - Real-time validation
  
- **Password**:
  - Required
  - 6-50 chars
  - Must contain: uppercase, lowercase, digit
  - Shows specific requirements in placeholder
  
- **Confirm Password**:
  - Required
  - Must match password field
  - Real-time comparison
  
- **Phone Number**:
  - Required
  - Exactly 10 digits
  - Auto-strips non-digits
  - Max length enforced
  
- **Emergency Contact Name**:
  - Required
  - 2-50 chars
  - Letters and spaces only
  
- **Emergency Contact Phone**:
  - Required
  - Exactly 10 digits
  - Auto-strips non-digits

**Features**:
- Field-level error messages with icons
- Input styling on error (red border)
- Error clearing on input change
- Auto-formatting for phone numbers
- Maximum length constraints
- Character type restrictions

---

### 3. Visitors Page (`client/src/pages/Visitors.jsx`)

**Form Validation**:
- **Visitor Name**:
  - Required
  - 2-100 chars
  - Letters and spaces only
  - Shows error messages
  
- **Visit Date**:
  - Required
  - Cannot select past dates
  - Shows error if invalid
  
- **Student Email** (optional):
  - If provided, must be valid format
  
- **Contact** (optional):
  - If provided, must be 10 digits
  - Auto-strips non-digits
  
- **Notes**: Max 500 chars
- **ID Type**: Dropdown with predefined options
- **Room Number**: Max 10 chars

**Features**:
- Form reset on successful submission
- Loading state during submission
- Field-level error display
- Disabled inputs during submission
- Real-time validation feedback

---

### 4. Bookings Page (`client/src/pages/Bookings.jsx`)

**Booking Form Validation**:
- **Resource**: Required selection
- **Start Time**:
  - Required
  - Cannot be in past
  - Shows specific error message
  
- **End Time**:
  - Required
  - Must be after start time
  - Minimum 15 minutes duration
  - Maximum 2 hours duration
  - Shows specific duration errors

**Features**:
- Real-time validation on form submission
- Detailed error messages for time validation
- Disabled submit button during booking
- Field-level error highlighting
- Clears errors on successful booking

---

## CSS Error Styling (`client/src/styles.css`)

### Error Input Classes
```css
.error-input {
  border-color: var(--danger); /* #ef4444 */
  background-color: rgba(239, 68, 68, 0.05);
}

.error-input:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
```

### Field Error Messages
```css
.field-error {
  color: var(--danger);
  font-size: 0.8rem;
  margin-top: 4px;
}

.field-error::before {
  content: "✕ ";
  margin-right: 4px;
}
```

### Error Alert
```css
.error {
  background-color: var(--danger);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.error::before {
  content: "⚠️";
}
```

---

## Validation Flow Diagram

```
User Input
    ↓
Frontend Validation
├─ Field-level validation
├─ Real-time error display
├─ Prevent invalid submission
    ↓
API Request (if valid)
    ↓
Backend Validation (Zod)
├─ Type checking
├─ Length constraints
├─ Pattern matching
├─ Enum validation
├─ Custom validators
    ↓
Database Operations
├─ Duplicate checking
├─ Business logic validation
├─ Authorization checks
    ↓
Response
├─ Success: 201/200
└─ Error: 400/403/409/etc
```

---

## Best Practices Implemented

### Backend
1. ✅ Zod schemas for all inputs
2. ✅ Type safety and coercion
3. ✅ Detailed error messages
4. ✅ Enum validation for restricted values
5. ✅ Length limits on all text fields
6. ✅ Regex patterns for format validation
7. ✅ DateTime validation with ISO format
8. ✅ Custom validation logic (booking duration, past dates)
9. ✅ Authorization checks (role-based)
10. ✅ Conflict detection (duplicate bookings)

### Frontend
1. ✅ Field-level validation functions
2. ✅ Real-time error clearing
3. ✅ Visual error indicators
4. ✅ Specific error messages
5. ✅ Input masking/auto-formatting
6. ✅ Maximum length enforcement
7. ✅ Pattern-based validation
8. ✅ Disabled submit during submission
9. ✅ Form reset on success
10. ✅ User-friendly placeholder hints

---

## Testing Validation

### Test Cases for Login
1. ✅ Empty email and password
2. ✅ Invalid email format
3. ✅ Short password (<6 chars)
4. ✅ Valid credentials

### Test Cases for Register
1. ✅ All fields empty
2. ✅ Invalid name (with numbers)
3. ✅ Invalid email
4. ✅ Weak password
5. ✅ Password mismatch
6. ✅ Invalid phone number
7. ✅ All valid inputs

### Test Cases for Bookings
1. ✅ Booking in past
2. ✅ End before start
3. ✅ Duration too short (<15 min)
4. ✅ Duration too long (>2 hours)
5. ✅ Valid booking

### Test Cases for Visitors
1. ✅ Invalid visitor name
2. ✅ Past visit date
3. ✅ Invalid contact number
4. ✅ Invalid email
5. ✅ Valid submission

---

## Error Response Format

```json
{
  "message": "Invalid input",
  "errors": [
    {
      "path": "email",
      "message": "Invalid email format"
    },
    {
      "path": "password",
      "message": "Password must contain uppercase, lowercase, and digits"
    }
  ]
}
```

---

## Future Enhancements

1. Add CAPTCHA for registration
2. Implement rate limiting on auth endpoints
3. Add password strength indicator
4. Implement email verification
5. Add two-factor authentication
6. Server-side session validation
7. CSRF token validation
8. SQL injection prevention (already using Mongoose)
9. XSS protection (React handles this)
10. Data sanitization for text fields

---

**Last Updated**: January 2026
**System**: ITPM (Integrated Hostel Portal Management)
**Status**: Complete with Comprehensive Validation
