# Login Credentials

## Admin Account

**Email**: `admin@hostelmate.local`  
**Password**: `Admin@123`

---

## How to Login

1. Open the application at http://localhost:5173
2. Click "Login" (or go to /login)
3. Enter the credentials above
4. Click "Login" button

---

## Troubleshooting

If you're getting "Invalid credentials" error, make sure:

1. ✅ Email is exactly: `admin@hostelmate.local` (not `admin@hostel.com`)
2. ✅ Password is exactly: `Admin@123` (case-sensitive)
3. ✅ No extra spaces before or after
4. ✅ Database is seeded (run `npm run seed --workspace server`)

---

## Creating New Users

### Student Registration
1. Go to /register
2. Fill all required fields:
   - Name (letters only)
   - Email (valid format)
   - Password (6+ chars with uppercase, lowercase, digit)
   - Phone (exactly 10 digits)
   - Emergency Contact Name
   - Emergency Contact Phone (exactly 10 digits)
3. Click "Register"
4. Wait for admin approval (status will be "pending")

### Admin Approval
1. Login as admin
2. Go to Admin → Students
3. Find pending student
4. Approve their account

---

## Notes

- Only one admin account exists by default
- Students can self-register but need admin approval
- Admin has access to all admin routes
- Students can only access student routes when approved
