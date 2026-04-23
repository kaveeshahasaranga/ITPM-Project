import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireApproved } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import Announcement from "../models/Announcement.js";

const router = Router();

const schema = z.object({
  message: z.string().min(3).max(1000)
});

router.get("/", requireAuth, requireApproved, async (_req, res) => {
  const announcements = await Announcement.find().sort({ createdAt: -1 });
  res.json(announcements);
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const announcement = await Announcement.create({
    adminId: req.user._id,
    message: parse.data.message
  });
  res.status(201).json(announcement);
});

export default router;
