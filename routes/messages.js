import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireApproved } from "../middleware/auth.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

const router = Router();

const sendMessageSchema = z.object({
    recipientId: z.string().optional(),
    content: z.string().min(1).max(2000)
});

// Send a message
router.post("/", requireAuth, requireApproved, async (req, res) => {
    try {
        const parse = sendMessageSchema.safeParse(req.body);
        if (!parse.success) {
            return res.status(400).json({ message: "Invalid input" });
        }

        const { recipientId, content } = parse.data;
        const senderId = req.user._id;
        const senderRole = req.user.role;

        let messageType = "personal";
        let isStudentToAdmin = true;
        let finalRecipientId = recipientId;

        if (senderRole === "admin") {
            messageType = "reply";
            isStudentToAdmin = false;
            if (!recipientId) {
                return res.status(400).json({ message: "Recipient ID required for admin messages" });
            }
            // Verify recipient exists
            const recipient = await User.findById(recipientId);
            if (!recipient) {
                return res.status(404).json({ message: "Recipient not found" });
            }
        } else {
            // Student sending to admin
            finalRecipientId = undefined; // Goes to all admins conceptually, or handled by notification
        }

        const message = await Message.create({
            sender: senderId,
            recipient: finalRecipientId,
            content,
            type: messageType,
            isStudentToAdmin
        });

        // Create Notification
        if (isStudentToAdmin) {
            // Notify all admins
            await Notification.create({
                title: "New Message from Student",
                message: `from ${req.user.name}: ${content.substring(0, 50)}...`,
                type: "message",
                role: "admin",
                createdBy: senderId
            });
        } else {
            // Notify specific student
            await Notification.create({
                title: "New Message from Admin",
                message: `Admin reply: ${content.substring(0, 50)}...`,
                type: "message",
                role: "student",
                recipientId: finalRecipientId,
                createdBy: senderId
            });
        }

        res.status(201).json(message);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get messages
router.get("/", requireAuth, requireApproved, async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        let query = {};

        if (userRole === "student") {
            // Student sees messages they sent OR messages sent to them
            query = {
                $or: [
                    { sender: userId },
                    { recipient: userId }
                ]
            };
        } else {
            // Admin sees specific conversation or all messages
            // Ideally admin should filter by student, but for now fetch all
            // If query param studentId is provided, filter by that
            if (req.query.studentId) {
                query = {
                    $or: [
                        { sender: req.query.studentId },
                        { recipient: req.query.studentId }
                    ]
                };
            }
        }

        const messages = await Message.find(query)
            .sort({ createdAt: 1 }) // Chronological for chat
            .populate("sender", "name role")
            .populate("recipient", "name role");

        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mark as read
router.patch("/:id/read", requireAuth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        // Determine authorization
        // If student: can mark messages SENT TO them as read
        // If admin: can mark messages SENT TO admin (isStudentToAdmin=true) as read

        // Simplification: if you are the recipient (or it's to admin and you are admin), you can mark read

        if (req.user.role === "student") {
            if (String(message.recipient) !== String(req.user._id)) {
                return res.status(403).json({ message: "Access denied" });
            }
        } else {
            // Admin
            if (!message.isStudentToAdmin) {
                // Admin shouldn't mark their own sent messages as read? 
                // Logic: Admin marks read messages that came FROM students
                return res.status(403).json({ message: "Access denied" });
            }
        }

        message.read = true;
        await message.save();
        res.json(message);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete message
router.delete("/:id", requireAuth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        // Allow deletion if user is the sender OR the recipient
        // Currently we only have sender check.
        // Recipient check:
        // For student-to-admin: recipient is null (any admin), so admin can delete?
        // For admin-to-student: recipient is student.

        let canDelete = false;

        // 1. Sender can delete
        if (String(message.sender) === String(req.user._id)) {
            canDelete = true;
        }

        // 2. Recipient can delete (if specific recipient)
        if (message.recipient && String(message.recipient) === String(req.user._id)) {
            canDelete = true;
        }

        // 3. If message is to admin (recipient null) and user is admin
        if (!message.recipient && message.isStudentToAdmin && req.user.role === "admin") {
            canDelete = true;
        }

        if (!canDelete) {
            return res.status(403).json({ message: "Access denied" });
        }

        await message.deleteOne();
        res.json({ message: "Message deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
