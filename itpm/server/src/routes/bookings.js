import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireApproved } from "../middleware/auth.js";
import Booking from "../models/Booking.js";
import Resource from "../models/Resource.js";



const validateBookingTime = (data) => {
  const start = new Date(data.start);
  const end = new Date(data.end);
  if (end <= start) {
    return { valid: false, message: "End time must be after start time" };
  }
  if (start < new Date()) {
    return { valid: false, message: "Cannot book past dates" };
  }
  const durationMinutes = (end - start) / (1000 * 60);
  if (durationMinutes <= 0) {
    return { valid: false, message: "End time must be after start time" };
  }
  return { valid: true };
};

router.post("/", requireAuth, requireApproved, async (req, res) => {
  const parse = bookingSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ 
      message: "Invalid input",
      errors: parse.error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
    });
  }
  
  const timeValidation = validateBookingTime(parse.data);
  if (!timeValidation.valid) {
    return res.status(400).json({ message: timeValidation.message });
  }

  const start = new Date(parse.data.start);
  const end = new Date(parse.data.end);

  const resource = await Resource.findOneAndUpdate(
    { name: parse.data.resourceName },
    { $setOnInsert: { name: parse.data.resourceName, active: true } },
    { new: true, upsert: true }
  );
  if (!resource.active) {
    return res.status(400).json({ message: "Resource is inactive" });
  }

  const conflict = await Booking.findOne({
    resourceName: parse.data.resourceName,
    start: { $lt: end },
    end: { $gt: start }
  });
  if (conflict) {
    return res.status(409).json({ message: "Time slot already booked" });
  }

  const booking = await Booking.create({
    resourceId: resource._id,
    resourceName: parse.data.resourceName,
    studentId: req.user._id,
    start,
    end
  });

  res.status(201).json(booking);
});

router.get("/", requireAuth, requireApproved, async (req, res) => {
  const bookings = await Booking.find()
    .sort({ start: -1 })
    .populate("studentId", "name")
    .populate("resourceId", "name");
  res.json(bookings);
});

router.delete("/:id", requireAuth, requireApproved, async (req, res) => {
  const { id } = req.params;
  
  const booking = await Booking.findById(id);
  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }
  
  const bookingStudentId = String(booking.studentId);
  const currentUserId = String(req.user._id);
  
  if (bookingStudentId !== currentUserId) {
    return res.status(403).json({ message: "Authorization denied" });
  }
  
  const bookingDate = new Date(booking.start);
  const now = new Date();
  
  if (bookingDate < now) {
    return res.status(400).json({ message: "Cannot delete past bookings" });
  }
  
  await Booking.findByIdAndDelete(id);
  res.json({ message: "Booking deleted successfully" });
});

export default router;
