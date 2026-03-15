import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireApproved } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import MaintenanceRequest from "../models/MaintenanceRequest.js";
import Notification from "../models/Notification.js";

const router = Router();

const createSchema = z.object({
  category: z.enum(["Water", "Electricity", "Wi-Fi", "Furniture", "Plumbing", "HVAC", "Appliances"]),
  description: z.string().min(5).max(500)
});

router.post("/", requireAuth, requireApproved, async (req, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const item = await MaintenanceRequest.create({
    studentId: req.user._id,
    ...parse.data
  });

  // Create admin alert notification
  await Notification.create({
    title: "New Maintenance Request",
    message: `New ${parse.data.category} maintenance request from ${req.user.name}: "${parse.data.description}"`,
    type: "maintenance",
    role: "admin",
    createdBy: req.user._id
  });

  res.status(201).json(item);
});



router.patch("/:id", requireAuth, requireApproved, async (req, res) => {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const item = await MaintenanceRequest.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ message: "Request not found" });
  }
  if (req.user.role !== "student" || item.studentId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (item.status !== "Pending") {
    return res.status(400).json({ message: "Only pending requests can be edited" });
  }
  Object.assign(item, parse.data);
  await item.save();
  res.json(item);
});

router.delete("/:id", requireAuth, requireApproved, async (req, res) => {
  const item = await MaintenanceRequest.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ message: "Request not found" });
  }
  if (req.user.role !== "student" || item.studentId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (item.status === "In Progress") {
    return res.status(400).json({ message: "Cannot delete once in progress" });
  }
  await item.deleteOne();
  res.json({ message: "Deleted" });
});

router.delete("/:id/admin", requireAuth, requireRole("admin"), async (req, res) => {
  const item = await MaintenanceRequest.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ message: "Request not found" });
  }
  await item.deleteOne();
  res.json({ message: "Deleted" });
});

const statusSchema = z.object({
  status: z.enum(["Pending", "In Progress", "Completed"]),
  adminRemarks: z.string().optional()
});

router.patch("/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
  const parse = statusSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const item = await MaintenanceRequest.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ message: "Request not found" });
  }
  item.status = parse.data.status;
  item.adminRemarks = parse.data.adminRemarks || item.adminRemarks;
  item.statusUpdatedAt = new Date();
  await item.save();
  res.json(item);
});

export default router;
