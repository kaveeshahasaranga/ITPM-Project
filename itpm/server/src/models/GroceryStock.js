import mongoose from "mongoose";

const groceryStockSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    price: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, default: "pcs" },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("GroceryStock", groceryStockSchema);
