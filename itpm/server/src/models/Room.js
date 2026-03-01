import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true, unique: true },
    bedCount: { type: Number, required: true, min: 1 }
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
