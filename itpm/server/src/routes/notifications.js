import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Notification from "../models/Notification.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { unread, type } = req.query;
  const role = req.user?.role;
  if (!role || !["admin", "student"].includes(role)) {
    return res.status(403).json({ message: "Access denied" });
  }
  const query = { role };

  if (typeof unread !== "undefined") {
    query.read = unread === "true" ? false : true;
  }
  if (type) {
    query.type = String(type);
  }

  // Modified query to include role-based OR user-specific notifications
  const finalQuery = {
    $or: [
      { role },
      { recipientId: req.user._id }
    ],
    ...query
  };

  // Remove role from top-level query as it's now in $or
  delete query.role;

  const notifications = await Notification.find(finalQuery)
    .sort({ createdAt: -1 })
    .limit(50);

  res.json(notifications);
});

// Mark all notifications as read (must come before /:id routes)
router.patch("/read-all", requireAuth, async (req, res) => {
  const role = req.user?.role;
  if (!role || !["admin", "student"].includes(role)) {
    return res.status(403).json({ message: "Access denied" });
  }
  // Update notifications where:
  // 1. Role matches AND recipientId is null (general role notifications)
  // 2. recipientId matches current user

  const result = await Notification.updateMany(
    {
      read: false,
      $or: [
        { role, recipientId: null }, // Role-based, no specific recipient
        { recipientId: req.user._id } // Specific to user
      ]
    },
    { $set: { read: true } }
  );
  res.json({
    message: "All notifications marked as read",
    modifiedCount: result.modifiedCount
  });
});

// Mark single notification as read
router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const role = req.user?.role;
    if (!role || !["admin", "student"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if (notification.role !== role) {
      return res.status(403).json({ message: "Access denied" });
    }
    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete single notification
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const role = req.user?.role;
    if (!role || !["admin", "student"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if (notification.role !== role) {
      return res.status(403).json({ message: "Access denied" });
    }
    await notification.deleteOne();
    res.json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;