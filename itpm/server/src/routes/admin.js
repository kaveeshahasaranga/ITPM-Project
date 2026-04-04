import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import User from "../models/User.js";
import Room from "../models/Room.js";

const router = Router();

router.get("/students", requireAuth, requireRole("admin"), async (_req, res) => {
  const students = await User.find({ role: "student" })
    .select("name email status roomId bedNumber faculty year visitorNumber roomRequest")
    .populate("roomId", "roomNumber");
  res.json(students);
});

router.patch("/students/:id/approve", requireAuth, requireRole("admin"), async (req, res) => {
  const student = await User.findById(req.params.id);
  if (!student || student.role !== "student") {
    return res.status(404).json({ message: "Student not found" });
  }
  student.status = "approved";
  await student.save();
  res.json(student);
});

const assignSchema = z.object({
  roomNumber: z.string().min(1).max(10).regex(/^[0-9]+$/, "Room number must be numeric"),
  bedNumber: z.number().int().min(1).max(10),
  bedCount: z.number().int().min(1).max(10)
});

router.patch("/students/:id/assign-room", requireAuth, requireRole("admin"), async (req, res) => {
  const parse = assignSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const { roomNumber, bedNumber, bedCount } = parse.data;
  const student = await User.findById(req.params.id);
  if (!student || student.role !== "student") {
    return res.status(404).json({ message: "Student not found" });
  }

  let room = await Room.findOne({ roomNumber });
  if (!room) {
    room = await Room.create({ roomNumber, bedCount });
  }
  if (bedNumber > room.bedCount) {
    return res.status(400).json({ message: "Bed number exceeds room capacity" });
  }
  const existing = await User.findOne({ roomId: room._id, bedNumber });
  if (existing) {
    return res.status(409).json({ message: "Bed already assigned" });
  }

  student.roomId = room._id;
  student.bedNumber = bedNumber;
  student.roomRequest = {
    requested: false,
    preferredRoomNumber: undefined,
    preferredBedNumber: undefined,
    notes: undefined,
    requestedAt: undefined
  };
  await student.save();
  res.json(student);
});

router.get("/rooms/occupancy", requireAuth, requireRole("admin"), async (_req, res) => {
  const rooms = await Room.find();
  const result = [];
  for (const room of rooms) {
    const occupiedBeds = await User.countDocuments({ roomId: room._id });
    result.push({
      roomNumber: room.roomNumber,
      bedCount: room.bedCount,
      occupiedBeds
    });
  }
  res.json(result);
});

// Change user role
const changeRoleSchema = z.object({
  role: z.enum(["admin", "student"], { message: "Role must be either 'admin' or 'student'" })
});

router.patch("/users/:id/role", requireAuth, requireRole("admin"), async (req, res) => {
  const parse = changeRoleSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: parse.error.errors[0].message });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const oldRole = user.role;
  user.role = parse.data.role;
  await user.save();

  res.json({ 
    message: `User role changed from ${oldRole} to ${parse.data.role}`,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

export default router;
