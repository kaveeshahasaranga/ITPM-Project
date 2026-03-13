import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireApproved } from "../middleware/auth.js";
import User from "../models/User.js";

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
  const hasPaymentUpdate =
    typeof walletBalance === "number" ||
    paymentCardHolderName ||
    paymentCardBrand ||
    paymentCardNumber;
  if (hasPaymentUpdate && req.user.role !== "student") {
    return res.status(403).json({ message: "Only students can update payment details" });
  }
  if (typeof walletBalance === "number") {
    req.user.walletBalance = walletBalance;
  }
  if (paymentCardNumber) {
    req.user.paymentCard = {
      holderName: paymentCardHolderName || req.user.paymentCard?.holderName || "",
      brand: paymentCardBrand || req.user.paymentCard?.brand || "",
      last4: paymentCardNumber.slice(-4)
    };
  } else if (paymentCardHolderName || paymentCardBrand) {
    if (!req.user.paymentCard?.last4) {
      return res.status(400).json({ message: "Card number is required" });
    }
    req.user.paymentCard = {
      holderName: paymentCardHolderName || req.user.paymentCard?.holderName || "",
      brand: paymentCardBrand || req.user.paymentCard?.brand || "",
      last4: req.user.paymentCard.last4
    };
  }
  await req.user.save();
  res.json(req.user);
});

export default router;
