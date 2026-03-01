import mongoose from "mongoose";

const grocerySchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    item: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    notes: { type: String },
    photos: [{ type: String }],
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: "GroceryStock" },
    requestType: {
      type: String,
      enum: ["stock", "new"],
      required: true,
      default: "new"
    },
    unit: { type: String, default: "pcs" },
    pricePerUnit: { type: Number, min: 0, default: 0 },
    totalAmount: { type: Number, min: 0, default: 0 },
    paymentRequired: { type: Boolean, default: false },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid"],
      default: "Unpaid"
    },
    status: {
      type: String,
      enum: [
        "Pending Admin Review",
        "Awaiting Payment",
        "Waiting for Delivery",
        "Delivered",
        "Rejected"
      ],
      default: "Pending Admin Review"
    }
  },
  { timestamps: true }
);

export default mongoose.model("GroceryRequest", grocerySchema);
