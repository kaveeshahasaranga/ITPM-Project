import mongoose from "mongoose";

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String },
    phone: { type: String }
  },
  { _id: false }
);

const paymentCardSchema = new mongoose.Schema(
  {
    holderName: { type: String },
    brand: { type: String },
    last4: { type: String }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    resetToken: { type: String, select: false },
    resetTokenExpiry: { type: Date, select: false },
    role: { type: String, enum: ["student", "admin"], default: "student", index: true },
    status: { type: String, enum: ["pending", "approved"], default: "pending", index: true },
    phone: { type: String },
    emergencyContact: emergencyContactSchema,
    paymentCard: paymentCardSchema,
    walletBalance: { type: Number, default: 0, min: 0 },
    monthlySalary: { type: Number, default: 0 },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", index: true },
    bedNumber: { type: Number },
    faculty: { type: String },
    year: { type: String },
    visitorNumber: { type: String }
  },
  { timestamps: true }
);

// Compound index for common queries

