import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Optional: if null, it's for any admin
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
    type: { type: String, enum: ["personal", "reply"], default: "personal" },
    isStudentToAdmin: { type: Boolean, default: true } // Helper to easily filter
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
