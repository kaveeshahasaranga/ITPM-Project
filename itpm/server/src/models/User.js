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

const roomRequestSchema = new mongoose.Schema(
  {
    requested: { type: Boolean, default: false },
    preferredRoomNumber: { type: String },
    preferredBedNumber: { type: Number, min: 1, max: 10 },
    notes: { type: String },
    requestedAt: { type: Date }
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
    status: { type: String, enum: ["pending", "approved"], default: "approved", index: true },
    phone: { type: String },
    profilePicture: { type: String },
    emergencyContact: emergencyContactSchema,
    paymentCard: paymentCardSchema,
    roomRequest: roomRequestSchema,
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
userSchema.index({ role: 1, status: 1 });

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

export default mongoose.model("User", userSchema);
