import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireApproved } from "../middleware/auth.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const router = Router();

router.get("/me", requireAuth, requireApproved, async (req, res) => {
  const user = req.user.toJSON();
  let roommates = [];
  if (req.user.roomId) {
    roommates = await User.find({
      roomId: req.user.roomId,
      _id: { $ne: req.user._id }
    }).select("name email phone bedNumber");
  }
  res.json({
    ...user,
    room: req.user.roomId,
    roommates
  });
});

const updateSchema = z.object({
  name: z.string().min(2).max(50).regex(/^[a-zA-Z\s]+$/, "Name must contain only letters and spaces").optional(),
  phone: z.string().length(10).regex(/^[0-9]+$/, "Phone must be 10 digits").optional(),
  emergencyContact: z.string().length(10).regex(/^[0-9]+$/, "Emergency contact must be 10 digits").optional(),
  emergencyContactName: z.string().min(2).max(50).regex(/^[a-zA-Z\s]+$/, "Emergency contact name must contain only letters and spaces").optional(),
  monthlySalary: z.number().min(0).max(999999).optional(),
  faculty: z.string().min(1).max(50).optional(),
  year: z.string().min(1).max(20).optional(),
  visitorNumber: z.string().min(1).max(50).optional(),
  profilePicture: z.union([
    z
      .string()
      .max(3000000)
      .refine(
        (value) =>
          /^https?:\/\//i.test(value) ||
          /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value),
        "Profile picture must be a valid image URL or data URL"
      ),
    z.literal("")
  ]).optional(),
  walletBalance: z.number().min(0).max(10000000).optional(),
  paymentCardHolderName: z.string().min(2).max(50).regex(/^[a-zA-Z\s]+$/, "Card holder name must contain only letters and spaces").optional(),
  paymentCardBrand: z.string().min(2).max(20).optional(),
  paymentCardNumber: z.string().regex(/^\d{16}$/, "Card number must be exactly 16 digits").optional()
});

const roomRequestSchema = z.object({
  preferredRoomNumber: z
    .string()
    .regex(/^[0-9]+$/, "Preferred room number must be numeric")
    .max(10)
    .optional(),
  preferredBedNumber: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(700).optional()
});

router.put("/me", requireAuth, requireApproved, async (req, res) => {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const {
    name,
    phone,
    emergencyContact,
    emergencyContactName,
    monthlySalary,
    faculty,
    year,
    visitorNumber,
    profilePicture,
    walletBalance,
    paymentCardHolderName,
    paymentCardBrand,
    paymentCardNumber
  } = parse.data;
  if (name) {
    req.user.name = name;
  }
  if (phone) {
    req.user.phone = phone;
  }
  if (emergencyContact) {
    req.user.emergencyContact = {
      name: emergencyContactName || req.user.emergencyContact?.name || "",
      phone: emergencyContact
    };
  }
  if (typeof monthlySalary === "number") {
    req.user.monthlySalary = monthlySalary;
  }
  if (faculty) {
    req.user.faculty = faculty;
  }
  if (year) {
    req.user.year = year;
  }
  if (visitorNumber) {
    req.user.visitorNumber = visitorNumber;
  }
  if (typeof profilePicture === "string") {
    req.user.profilePicture = profilePicture.trim() || undefined;
  }
  const hasPaymentUpdate =
    typeof walletBalance === "number" ||
    paymentCardHolderName ||
    paymentCardBrand ||
    paymentCardNumber;
  const hasCardUpdate = paymentCardHolderName || paymentCardBrand || paymentCardNumber;
  if (hasPaymentUpdate && req.user.role !== "student") {
    return res.status(403).json({ message: "Only students can update payment details" });
  }
  if (typeof walletBalance === "number") {
    req.user.walletBalance = walletBalance;
  }
  if (hasCardUpdate && !paymentCardNumber) {
    return res.status(400).json({ message: "Card number is required" });
  }
  if (paymentCardNumber) {
    req.user.paymentCard = {
      holderName: paymentCardHolderName || req.user.paymentCard?.holderName || "",
      brand: paymentCardBrand || req.user.paymentCard?.brand || "",
      last4: paymentCardNumber.slice(-4)
    };
  }
  await req.user.save();
  res.json(req.user);
});

router.post("/me/room-request", requireAuth, requireApproved, async (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Only students can request rooms" });
  }

  const parse = roomRequestSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid room request input" });
  }

  const { preferredRoomNumber, preferredBedNumber, notes } = parse.data;
  req.user.roomRequest = {
    requested: true,
    preferredRoomNumber: preferredRoomNumber?.trim() || undefined,
    preferredBedNumber,
    notes: notes?.trim() || undefined,
    requestedAt: new Date()
  };

  await req.user.save();
  await Notification.create({
    title: "New room request",
    message: `${req.user.name} (${req.user.email}) submitted a room request.`,
    type: "room-request",
    role: "admin",
    createdBy: req.user._id
  });

  return res.json({
    message: "Room request submitted successfully",
    roomRequest: req.user.roomRequest
  });
});

router.delete("/me/room-request", requireAuth, requireApproved, async (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Only students can cancel room requests" });
  }

  req.user.roomRequest = {
    requested: false,
    preferredRoomNumber: undefined,
    preferredBedNumber: undefined,
    notes: undefined,
    requestedAt: undefined
  };

  await req.user.save();
  return res.json({ message: "Room request cancelled" });
});

export default router;
