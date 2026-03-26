import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import User from "../models/User.js";
import Room from "../models/Room.js";
import VisitorPass from "../models/VisitorPass.js";
import Notification from "../models/Notification.js";
import { sendEmail } from "../utils/mailer.js";

const router = Router();

const adminCreateSchema = z.object({
  visitorName: z.string().min(2).max(100).regex(/^[a-zA-Z\s]+$/, "Name must contain only letters and spaces"),
  purpose: z.string().min(2).max(200).optional(),
  visitDate: z.string().datetime("Invalid visit date format"),
  idType: z.enum(["Aadhar", "PAN", "License", "Passport", "Other"]).optional(),
  idNumber: z.string().min(2).max(20).optional(),
  contact: z.string().length(10).regex(/^[0-9]+$/, "Contact must be 10 digits").optional(),
  notes: z.string().max(500).optional(),
  studentEmail: z.string().email("Invalid email format").optional(),
  roomNumber: z.string().min(1).max(10).optional()
});

const studentRequestSchema = z.object({
  visitorName: z.string().min(2).max(100).regex(/^[a-zA-Z\s]+$/, "Name must contain only letters and spaces"),
  purpose: z.string().min(2).max(200).optional(),
  visitDate: z.string().datetime("Invalid visit date format").refine((date) => {
    const visitDate = new Date(date);
    const now = new Date();
    return visitDate > now;
  }, { message: "Visit date must be in the future, not in the past" }),
  idType: z.enum(["Aadhar", "PAN", "License", "Passport", "Other"]).optional(),
  idNumber: z.string().min(2).max(20).optional(),
  contact: z.string().length(10, "Contact must be exactly 10 digits").regex(/^[0-9]+$/, "Contact must contain only digits"),
  notes: z.string().max(500).optional(),
  roomNumber: z.string().optional()
});

function generatePassCode() {
  return `VIS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// Student routes MUST come first (specific routes before generic ones)

// Student requests visitor pass
router.post("/request", requireAuth, async (req, res) => {
  const parse = studentRequestSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input", errors: parse.error.errors });
  }

  const pass = await VisitorPass.create({
    visitorName: parse.data.visitorName,
    purpose: parse.data.purpose,
    visitDate: new Date(parse.data.visitDate),
    idType: parse.data.idType,
    idNumber: parse.data.idNumber,
    contact: parse.data.contact,
    notes: parse.data.notes,
    studentId: req.user._id,
    roomNumber: parse.data.roomNumber
  });

  await Notification.create({
    title: "New visitor request",
    message: `${req.user.name || "Student"} requested a visitor pass for ${pass.visitorName} on ${new Date(pass.visitDate).toLocaleString()}.`,
    type: "visitor-request",
    role: "admin",
    createdBy: req.user._id
  });

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: "HostelMate • New visitor request",
      text: `${req.user.name || "Student"} requested a visitor pass for ${pass.visitorName} on ${new Date(pass.visitDate).toLocaleString()}.`
    });
  }

  res.status(201).json(pass);
});

// Get student's visitor passes
router.get("/student/passes", requireAuth, async (req, res) => {
  const passes = await VisitorPass.find({ studentId: req.user._id }).sort({ createdAt: -1 });
  res.json(passes);
});

// Public scan endpoint for security verification
router.get("/scan", async (req, res) => {
  const code = String(req.query.code || "").trim();
  if (!code) {
    return res.status(400).json({ message: "Pass code is required" });
  }

  const pass = await VisitorPass.findOne({ passCode: code }).populate("studentId", "name email roomId");
  if (!pass) {
    return res.status(404).json({ message: "Visitor pass not found" });
  }

  let roomNumber = pass.roomNumber || "";
  if (!roomNumber && pass.studentId?.roomId) {
    const room = await Room.findById(pass.studentId.roomId).select("roomNumber");
    roomNumber = room?.roomNumber || "";
  }

  return res.json({
    passCode: pass.passCode,
    visitorName: pass.visitorName,
    purpose: pass.purpose,
    visitDate: pass.visitDate,
    idType: pass.idType,
    idNumber: pass.idNumber,
    contact: pass.contact,
    notes: pass.notes,
    studentName: pass.studentId?.name || "",
    studentEmail: pass.studentId?.email || "",
    roomNumber
  });
});

// Admin routes

router.get("/", requireAuth, requireRole("admin"), async (_req, res) => {
  const passes = await VisitorPass.find().sort({ createdAt: -1 }).populate("studentId", "name email");
  res.json(passes);
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const parse = adminCreateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }

  let studentId = undefined;
  if (parse.data.studentEmail) {
    const student = await User.findOne({ email: parse.data.studentEmail.toLowerCase() });
    if (student && student.role === "student") {
      studentId = student._id;
    }
  }

  let passCode = generatePassCode();
  // Ensure uniqueness (simple retry)
  for (let i = 0; i < 3; i += 1) {
    const exists = await VisitorPass.findOne({ passCode });
    if (!exists) break;
    passCode = generatePassCode();
  }

  const pass = await VisitorPass.create({
    visitorName: parse.data.visitorName,
    purpose: parse.data.purpose,
    visitDate: new Date(parse.data.visitDate),
    idType: parse.data.idType,
    idNumber: parse.data.idNumber,
    contact: parse.data.contact,
    notes: parse.data.notes,
    studentId,
    roomNumber: parse.data.roomNumber,
    passCode
  });

  res.status(201).json(pass);
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const pass = await VisitorPass.findById(req.params.id);
  if (!pass) {
    return res.status(404).json({ message: "Visitor pass not found" });
  }
  await pass.deleteOne();
  res.json({ message: "Deleted" });
});

// Admin approve visitor pass and generate QR code
router.patch("/:id/approve", requireAuth, requireRole("admin"), async (req, res) => {
  const pass = await VisitorPass.findById(req.params.id);
  if (!pass) {
    return res.status(404).json({ message: "Visitor pass not found" });
  }
  if (pass.passCode) {
    return res.status(400).json({ message: "Pass already approved" });
  }

  let passCode = generatePassCode();
  for (let i = 0; i < 3; i += 1) {
    const exists = await VisitorPass.findOne({ passCode });
    if (!exists) break;
    passCode = generatePassCode();
  }

  pass.passCode = passCode;
  await pass.save();
  res.json(pass);
});

export default router;
