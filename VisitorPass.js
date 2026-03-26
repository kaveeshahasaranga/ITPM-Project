import mongoose from "mongoose";

const visitorPassSchema = new mongoose.Schema(
  {
    visitorName: { type: String, required: true },
    purpose: { type: String },
    visitDate: { type: Date, required: true },
    idType: { type: String },
    idNumber: { type: String },
    contact: { type: String },
    notes: { type: String },
    passCode: { type: String, unique: true, sparse: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    roomNumber: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model("VisitorPass", visitorPassSchema);
