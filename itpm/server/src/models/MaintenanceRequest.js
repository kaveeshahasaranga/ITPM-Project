import mongoose from "mongoose";

const maintenanceSchema = new mongoose.Schema(
 
);

maintenanceSchema.index({ status: 1, createdAt: -1 });
maintenanceSchema.index({ studentId: 1, status: 1 });

export default mongoose.model("MaintenanceRequest", maintenanceSchema);
