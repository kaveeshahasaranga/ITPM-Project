import mongoose from "mongoose";

const maintenanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: {
      type: String,
      enum: ["Water", "Electricity", "Wi-Fi", "Furniture", "Plumbing", "HVAC", "Appliances"],
      required: true,
      index: true
    },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
      index: true
    },
    adminRemarks: { type: String },
    statusUpdatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

maintenanceSchema.index({ status: 1, createdAt: -1 });
maintenanceSchema.index({ studentId: 1, status: 1 });

export default mongoose.model("MaintenanceRequest", maintenanceSchema);
