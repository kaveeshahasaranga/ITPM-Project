import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Notice", noticeSchema);
