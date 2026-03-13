import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", index: true },
    resourceName: { type: String, required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true }
  },
  { timestamps: true }
);

bookingSchema.index({ start: 1, resourceId: 1 });
bookingSchema.index({ studentId: 1, start: -1 });

export default mongoose.model("Booking", bookingSchema);
