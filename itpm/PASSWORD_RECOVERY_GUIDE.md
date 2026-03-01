# Password Recovery System - Complete Solution

## Problem Statement
Previously, students had no direct way to reset their passwords. The old system required:
1. Student submits recovery request via email
2. Admin manually resets password in backend
3. Admin sends new password to student
❌ Not user-friendly, requires admin intervention for every password reset

## New Solution: Secure Token-Based Recovery

### Architecture
The new system uses industry-standard email verification tokens:

```
Student Request Email → Backend Generates Token (30 min expiry) 
→ Email Token to Student → Student Enters Token & New Password 
→ Backend Validates Token → Password Updated Successfully
```

## Implementation Details

### 1. Backend Changes

#### User Model (`server/src/models/User.js`)
Added two new fields to store password reset tokens:
```javascript
resetToken: { type: String, select: false }         // Secure random token
resetTokenExpiry: { type: Date, select: false }     // Token expiration time
```

#### Auth Routes (`server/src/routes/auth.js`)

**Endpoint 1: POST `/auth/recover`** (Step 1)
- Request: `{ email: "student@example.com" }`
- Process:
  1. Generates random 32-byte hex token
  2. Sets token expiry to 30 minutes
  3. Saves token to database
  4. Sends email with token and reset link
  5. Notifies admin via notification
- Response: Generic message (doesn't reveal if email exists - security best practice)
- Example Email: 
  ```
  Reset Link: http://localhost:5175/recover?email=...&token=...
  Token: a1b2c3d4e5f6g7h8... (expires in 30 minutes)
  ```

**Endpoint 2: POST `/auth/reset-password`** (Step 2)
- Request:
  ```json
  {
    "email": "student@example.com",
    "token": "a1b2c3d4e5f6g7h8...",
    "newPassword": "NewPass123"
  }
  ```
- Validations:
  1. ✅ Token matches stored token exactly
  2. ✅ Token hasn't expired (within 30 minutes)
  3. ✅ Password meets requirements: 6+ chars, uppercase, lowercase, digits
- Process:
  1. Validates token and expiry
  2. Hashes new password with bcrypt (12 rounds)
  3. Clears token and expiry from database
  4. Sends confirmation email to student
- Response: Success message with next steps

### 2. Frontend Changes

#### Recover.jsx Component
New two-step recovery flow:

**Step 1: Email Submission**
- User enters email address
- Submits to `/auth/recover`
- Receives success message: "Check your email for password reset instructions"
- Auto-advances to Step 2 after 2 seconds

**Step 2: Token & Password Reset**
- User pastes token from email (or URL auto-fills from params)
- Enters new password with confirmation
- Validations:
  - ✅ Email required
  - ✅ Token required (32-byte hex)
  - ✅ Password meets complexity requirements
  - ✅ Passwords match
- Submits to `/auth/reset-password`
- On success: Redirects to login page after 2 seconds

### Features

#### URL Parameter Support
If user clicks email link: `http://localhost:5175/recover?email=...&token=...`
- Email and token auto-populate in form
- Jumps directly to Step 2 (token/password entry)
- User just needs to enter and confirm new password

#### Security Features
1. **Token Expiry**: All tokens expire after 30 minutes
2. **One-time Use**: Token is cleared after successful reset
3. **Secure Generation**: Uses crypto.randomBytes(32) for randomness
4. **Password Hashing**: bcrypt with 12 rounds
5. **Generic Messages**: Doesn't reveal if email exists (prevents enumeration)
6. **Password Validation**:
   - Minimum 6 characters
   - Must include uppercase letter
   - Must include lowercase letter
   - Must include digit

#### Email Notifications
1. **Recovery Request Email** → Student gets reset instructions
2. **Confirmation Email** → Student notified when password changed
3. **Admin Notification** → Admin sees recovery attempt in notifications

### User Flow

#### Scenario 1: Student Forgets Password
```
1. Click "Forgot Password?" on login
2. Enter email → Click "Send Reset Link"
3. Check email inbox (including spam folder)
4. Click link or copy token
5. Enter new password + confirm
6. Password reset successful → Redirect to login
7. Login with new credentials
```

#### Scenario 2: Admin Helping Student (Optional)
The old `/admin/reset-password` endpoint still exists:
- Admin can manually reset any student's password if needed
- Generates temporary password
- Sends to student email
- Useful for account recovery in extreme cases

## API Endpoints Summary

| Endpoint | Method | Purpose | Auth | Rate Limited |
|----------|--------|---------|------|--------------|
| `/auth/recover` | POST | Request password reset | None | Yes (5 req/hour) |
| `/auth/reset-password` | POST | Verify token & reset password | None | Yes (5 req/hour) |
| `/admin/reset-password` | POST | Admin manual reset | Required | No |

## Testing

### Test Case 1: Valid Recovery
```bash
# Step 1: Request recovery
POST http://localhost:4000/auth/recover
{ "email": "student@example.com" }

# Check email for token...

# Step 2: Reset with token
POST http://localhost:4000/auth/reset-password
{
  "email": "student@example.com",
  "token": "TOKEN_FROM_EMAIL",
  "newPassword": "NewPass123"
}
```

### Test Case 2: Expired Token
```bash
# Wait 31+ minutes after recovery request
# Step 2 will return: "Reset token has expired"
```

### Test Case 3: Invalid Token
```bash
# Use wrong/invalid token
# Response: "Invalid reset token"
```

## Database Changes
None required for existing students - new fields are optional and don't affect login.

## Next Steps
1. ✅ Update User model with token fields
2. ✅ Implement recovery endpoints in auth.js
3. ✅ Update Recover.jsx with two-step UI
4. ✅ Test email delivery (check mailer configuration)
5. Deploy to production with:
   - Update `resetLink` domain from localhost to production URL
   - Test email service (Gmail, SendGrid, etc.)

## Production Checklist
- [ ] Update reset link domain in auth.js from localhost:5175 to production domain
- [ ] Ensure email service is configured (SMTP/SendGrid)
- [ ] Test email delivery in staging
- [ ] Add email rate limiting (already using authLimiter)
- [ ] Monitor token generation (verify randomness)
- [ ] Add analytics for recovery requests (optional)
