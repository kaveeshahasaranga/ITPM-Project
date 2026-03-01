import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    role: { type: String, enum: ["admin", "student"], default: "admin" },
    read: { type: Boolean, default: false },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

notificationSchema.index({ role: 1, read: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);