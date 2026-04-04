import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import crypto from "crypto";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { sendEmail } from "../utils/mailer.js";
import { authLimiter } from "../middleware/security.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name too long").regex(/^[a-zA-Z\s]+$/, "Name must contain only letters and spaces"),
  email: z.string().email("Invalid email format").max(100, "Email too long").refine((value) => value === value.toLowerCase(), "Email cannot contain uppercase letters"),
  password: z.string().min(6, "Password must be at least 6 characters").max(50, "Password too long").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and digits"),
  phone: z.string().length(10, "Phone must be exactly 10 digits").regex(/^[0-9]+$/, "Phone must contain only numbers"),
  emergencyContact: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name too long").regex(/^[a-zA-Z\s]+$/, "Name must contain only letters and spaces"),
    phone: z.string().length(10, "Phone must be exactly 10 digits").regex(/^[0-9]+$/, "Phone must contain only numbers")
  })
});

router.post("/register", async (req, res, next) => {
  try {
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) {
      const errors = parse.error.errors.map(e => e.message).join(", ");
      return res.status(400).json({ message: errors });
    }
    const { name, email, password, phone, emergencyContact } = parse.data;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash,
      phone,
      emergencyContact: { name: emergencyContact.name, phone: emergencyContact.phone },
      role: "student",
      status: "approved"
    });
    return res.status(201).json({ id: user._id, message: "Registration successful. You can now log in." });
  } catch (error) {
    next(error);
  }
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format").max(100, "Email too long"),
  password: z.string().min(1, "Password is required").max(50, "Password too long")
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      const errors = parse.error.errors.map(e => e.message).join(", ");
      return res.status(400).json({ message: errors });
    }
    const { email, password } = parse.data;
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.role === "student" && user.status !== "approved") {
      user.status = "approved";
      await user.save();
    }
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET || "secret", 
      { expiresIn: "7d" }
    );
    return res.json({ 
      token, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

const recoverSchema = z.object({
  email: z.string().email("Invalid email format").max(100, "Email too long"),
  newPassword: z.string().min(6, "Password must be at least 6 characters").max(50, "Password too long").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and digits")
});

// Password recovery - Direct reset with email verification
router.post("/recover", authLimiter, async (req, res, next) => {
  try {
    const parse = recoverSchema.safeParse(req.body);
    if (!parse.success) {
      const errors = parse.error.errors.map(e => e.message).join(", ");
      return res.status(400).json({ message: errors });
    }

    const { email, newPassword } = parse.data;
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "No account found with this email. Please check and try again." });
    }

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordHash = passwordHash;
    await user.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: "HostelMate • Password Reset Successful",
      text: `Hi ${user.name},\n\nYour password has been successfully reset. You can now login with your new password.\n\nIf you didn't make this change, please contact support immediately.`
    });

    // Notify admin
    await Notification.create({
      title: "Password reset",
      message: `${user.name} (${normalizedEmail}) reset their password.`,
      type: "password-recovery",
      role: "admin",
      createdBy: user._id
    });

    return res.json({ message: "Password reset successful. You can now login with your new password." });
  } catch (error) {
    next(error);
  }
});

// Admin reset student password
const resetPasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters").max(50, "Password too long").optional()
});

router.post("/admin/reset-password", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const parse = resetPasswordSchema.safeParse(req.body);
    if (!parse.success) {
      const errors = parse.error.errors.map(e => e.message).join(", ");
      return res.status(400).json({ message: errors });
    }

    const { userId, newPassword } = parse.data;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const generatedPassword = newPassword || `Hm@${crypto.randomBytes(4).toString("hex")}`;
    const passwordHash = await bcrypt.hash(generatedPassword, 12);
    user.passwordHash = passwordHash;
    await user.save();

    // Notify the user
    const emailResult = await sendEmail({
      to: user.email,
      subject: "HostelMate • Password Reset",
      text: `Your password has been reset by admin.\n\nNew Password: ${generatedPassword}\n\nPlease login and change your password immediately.`
    });

    // Mark recovery notifications as read
    await Notification.updateMany(
      { 
        type: "password-recovery",
        createdBy: user._id,
        read: false
      },
      { $set: { read: true } }
    );

    const isProd = process.env.NODE_ENV === "production";
    const includeTemp = !isProd && (emailResult?.skipped || emailResult?.error);

    return res.json({ 
      message: `Password reset successful. New password sent to ${user.email}`,
      email: user.email,
      tempPassword: includeTemp ? generatedPassword : undefined,
      emailStatus: emailResult?.skipped ? "skipped" : (emailResult?.error ? "failed" : "sent")
    });
  } catch (error) {
    next(error);
  }
});

export default router;
