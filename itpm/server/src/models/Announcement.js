import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Announcement", announcementSchema);
