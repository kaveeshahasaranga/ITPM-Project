import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireApproved } from "../middleware/auth.js";
import Notice from "../models/Notice.js";
import Notification from "../models/Notification.js";

const router = Router();

const noticeSchema = z.object({
  message: z.string().min(3).max(1000)
});

router.post("/", requireAuth, requireApproved, async (req, res) => {
  const parse = noticeSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const notice = await Notice.create({
    roomId: req.user.roomId || undefined,
    studentId: req.user._id,
    message: parse.data.message
  });
  if (req.user.role === "admin") {
    await Notification.create({
      title: "New Notice",
      message: parse.data.message,
      type: "notice",
      role: "student",
      createdBy: req.user._id
    });
  }
  res.status(201).json(notice);
});

router.get("/", requireAuth, requireApproved, async (req, res) => {
  const notices = await Notice.find()
    .sort({ createdAt: -1 })
    .populate("studentId", "name")
    .populate("roomId", "roomNumber");
  res.json(notices);
});

// Admin delete student notice
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }
    res.json({ message: "Notice deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
