import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireApproved } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import GroceryRequest from "../models/GroceryRequest.js";
import GroceryStock from "../models/GroceryStock.js";
import Notification from "../models/Notification.js";

const router = Router();

// Parse quantity with units: "500g", "0.5kg", "2l", "500ml" etc.
const parseQuantityWithUnit = (input, stockUnit) => {
  if (!input) return { value: null, error: "Invalid input" };
  
  const unitConversions = {
    // Weight conversions to kg
    "g": 0.001, "gram": 0.001, "grams": 0.001,
    "kg": 1, "kilogram": 1, "kilograms": 1,
    // Volume conversions to liters
    "ml": 0.001, "milliliter": 0.001, "milliliters": 0.001,
    "l": 1, "liter": 1, "liters": 1, "litre": 1, "litres": 1,
    // Count
    "pcs": 1, "pc": 1, "piece": 1, "pieces": 1, "qty": 1
  };
  
  const str = input.toString().toLowerCase().trim();
  const regex = /^([\d.]+)\s*([a-zA-Z]*)$/;
  const match = str.match(regex);
  
  if (!match) return { value: null, error: "Use format: 500g, 0.5kg, 2l, etc." };
  
  const rawValue = parseFloat(match[1]);
  const rawUnit = (match[2] || stockUnit).toLowerCase();
  
  if (isNaN(rawValue) || rawValue <= 0) {
    return { value: null, error: "Quantity must be greater than 0" };
  }
  
  // Normalize units
  const baseUnit = stockUnit.toLowerCase();
  
  // Convert to stock's unit system
  let finalValue = rawValue;
  
 
    // Assume direct numeric input
    finalValue = rawValue;
  }
  
  return { value: Number(finalValue.toFixed(4)), error: null };
};

const createSchema = z.object({
  item: z.string().min(2).max(100).regex(/^[a-zA-Z0-9\s]+$/, "Item name must contain alphanumeric characters"),
  quantity: z.union([z.string(), z.number()]),
  notes: z.string().max(500).optional(),
  photos: z.array(z.string().url("Invalid URL format")).max(4).optional(),
  stockId: z.string().optional(),
  payNow: z.boolean().optional()
});

const updateSchema = z.object({
  item: z.string().min(2).max(100).regex(/^[a-zA-Z0-9\s]+$/, "Item name must contain alphanumeric characters").optional(),
  quantity: z.number().min(0.01).max(10000).optional(),
  notes: z.string().max(500).optional()
});

router.post("/", requireAuth, requireApproved, async (req, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const data = parse.data;
  const requestType = data.stockId ? "stock" : "new";

  if (requestType === "new") {
    const existing = await GroceryRequest.findOne({
      studentId: req.user._id,
      item: data.item,
      requestType: "new",
      status: { $in: ["Pending Admin Review", "Awaiting Payment"] }
    });
    if (existing) {
      return res.status(409).json({ message: "Pending request already exists for this item" });
    }
  }

  let quantity = typeof data.quantity === 'number' ? data.quantity : parseFloat(data.quantity);
  
  if (isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({ message: "Invalid quantity" });
  }

  let requestPayload = {
    studentId: req.user._id,
    item: data.item,
    quantity: quantity,
    notes: data.notes,
    photos: data.photos,
    stockId: data.stockId,
    requestType,
    status: "Pending Admin Review",
    paymentRequired: false,
    paymentStatus: "Unpaid",
    pricePerUnit: 0,
    totalAmount: 0
  };

  if (requestType === "stock") {
    const stock = await GroceryStock.findById(data.stockId);
    if (!stock || !stock.active) {
      return res.status(404).json({ message: "Stock item not found" });
    }
    
    // Parse quantity with units if it's a string
    let parsedQuantity = quantity;
    if (typeof data.quantity === 'string') {
      const parsed = parseQuantityWithUnit(data.quantity, stock.unit);
      if (parsed.error) {
        return res.status(400).json({ message: parsed.error });
      }
      parsedQuantity = parsed.value;
    }
    
    if (parsedQuantity > stock.quantity) {
      return res.status(400).json({ message: `Only ${stock.quantity} ${stock.unit} available` });
    }
    if (!data.payNow) {
      return res.status(400).json({ message: "Payment is required for stock requests" });
    }
    if (!stock.price || stock.price <= 0) {
      return res.status(400).json({ message: "Stock item price is not set" });
    }
    if (!req.user.paymentCard?.last4) {
      return res.status(400).json({ message: "Add a payment card in your profile" });
    }
    // Calculate price per unit based on total price / total quantity
    const pricePerUnit = Number((stock.price / stock.quantity).toFixed(2));
    const totalAmount = Number((pricePerUnit * parsedQuantity).toFixed(2));
    
    requestPayload = {
      ...requestPayload,
      quantity: parsedQuantity,
      item: stock.name,
      unit: stock.unit,
      pricePerUnit: pricePerUnit,
      totalAmount: totalAmount,
      paymentRequired: true,
      paymentStatus: "Paid",
      status: "Waiting for Delivery"
    };
    if (req.user.walletBalance < requestPayload.totalAmount) {
      return res.status(400).json({ message: "Insufficient account balance" });
    }
    req.user.walletBalance = Number((req.user.walletBalance - requestPayload.totalAmount).toFixed(2));
    await req.user.save();
  }

  const request = await GroceryRequest.create(requestPayload);

  if (request.requestType === "stock") {
    await Notification.create({
      title: "Grocery Payment Received",
      message: `${req.user.name} paid for ${request.item} (Qty: ${request.quantity}). Total: LKR ${request.totalAmount.toFixed(2)}.`,
      type: "grocery",
      role: "admin",
      createdBy: req.user._id
    });
  }

  await Notification.create({
    title: "New Grocery Request",
    message: `New grocery request from ${req.user.name}: ${request.item} (Qty: ${request.quantity})${request.notes ? ` - ${request.notes}` : ""}`,
    type: "grocery",
    role: "admin",
    createdBy: req.user._id
  });

  res.status(201).json(request);
});

router.get("/", requireAuth, requireApproved, async (req, res) => {
  if (req.user.role === "admin") {
    const all = await GroceryRequest.find().populate("studentId", "name email");
    return res.json(all);
  }
  const mine = await GroceryRequest.find({ studentId: req.user._id });
  res.json(mine);
});

router.patch("/:id", requireAuth, requireApproved, async (req, res) => {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const request = await GroceryRequest.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }
  if (request.studentId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized to edit this request" });
  }
  if (request.status !== "Pending Admin Review" || request.requestType !== "new") {
    return res.status(400).json({ message: "Only pending new item requests can be edited" });
  }
  if (parse.data.item !== undefined) request.item = parse.data.item;
  if (parse.data.quantity !== undefined) request.quantity = parse.data.quantity;
  if (parse.data.notes !== undefined) request.notes = parse.data.notes;
  await request.save();
  res.json(request);
});

const statusSchema = z.object({
  status: z.enum([
    "Pending Admin Review",
    "Awaiting Payment",
    "Waiting for Delivery",
    "Delivered",
    "Rejected"
  ])
});

const stockCreateSchema = z.object({
  name: z.string().min(2).max(100).regex(/^[a-zA-Z0-9\s]+$/, "Stock name must contain alphanumeric characters"),
  quantity: z.number().int().min(0).max(10000),
  price: z.number().min(0.01).max(100000),
  unit: z.enum(["pcs", "kg", "liters", "boxes", "dozens"]).optional(),
  active: z.boolean().optional()
});

const stockUpdateSchema = z.object({
  name: z.string().min(2).max(100).regex(/^[a-zA-Z0-9\s]+$/, "Stock name must contain alphanumeric characters").optional(),
  quantity: z.number().int().min(0).max(10000).optional(),
  price: z.number().min(0.01).max(100000).optional(),
  unit: z.enum(["pcs", "kg", "liters", "boxes", "dozens"]).optional(),
  active: z.boolean().optional()
});

const pricingSchema = z.object({
  pricePerUnit: z.number().min(0.01).max(100000)
});

// Grocery stocks
router.get("/stocks", requireAuth, requireApproved, async (req, res) => {
  const query = req.user.role === "admin"
    ? {}
    : { active: true, quantity: { $gt: 0 }, price: { $gt: 0 } };
  const stocks = await GroceryStock.find(query).sort({ name: 1 });
  res.json(stocks);
});

router.post("/stocks", requireAuth, requireRole("admin"), async (req, res) => {
  const parse = stockCreateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const stock = await GroceryStock.create({
    name: parse.data.name,
    quantity: parse.data.quantity,
    price: parse.data.price,
    unit: parse.data.unit || "pcs",
    active: parse.data.active ?? true
  });
  res.status(201).json(stock);
});

router.patch("/stocks/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const parse = stockUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const stock = await GroceryStock.findById(req.params.id);
  if (!stock) {
    return res.status(404).json({ message: "Stock not found" });
  }
  if (parse.data.name !== undefined) stock.name = parse.data.name;
  if (parse.data.quantity !== undefined) stock.quantity = parse.data.quantity;
  if (parse.data.price !== undefined) stock.price = parse.data.price;
  if (parse.data.unit !== undefined) stock.unit = parse.data.unit;
  if (parse.data.active !== undefined) stock.active = parse.data.active;
  await stock.save();
  res.json(stock);
});

router.delete("/stocks/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const stock = await GroceryStock.findById(req.params.id);
  if (!stock) {
    return res.status(404).json({ message: "Stock not found" });
  }
  await stock.deleteOne();
  res.json({ message: "Deleted" });
});

router.patch("/:id/pricing", requireAuth, requireRole("admin"), async (req, res) => {
  const parse = pricingSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const request = await GroceryRequest.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }
  if (request.requestType !== "new") {
    return res.status(400).json({ message: "Pricing can only be set for new item requests" });
  }
  if (request.status !== "Pending Admin Review") {
    return res.status(400).json({ message: "Pricing can only be set for pending requests" });
  }
  if (request.paymentStatus === "Paid") {
    return res.status(400).json({ message: "Payment already completed" });
  }
  request.pricePerUnit = parse.data.pricePerUnit;
  request.totalAmount = Number((parse.data.pricePerUnit * request.quantity).toFixed(2));
  request.paymentRequired = true;
  request.status = "Awaiting Payment";
  await request.save();

  await Notification.create({
    title: "Grocery Payment Required",
    message: `Payment required for ${request.item} (Qty: ${request.quantity}). Total: LKR ${request.totalAmount.toFixed(2)}.`,
    type: "grocery",
    role: "student",
    createdBy: req.user._id
  });

  res.json(request);
});

router.post("/:id/pay", requireAuth, requireApproved, async (req, res) => {
  const request = await GroceryRequest.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }
  if (request.studentId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized to pay for this request" });
  }
  if (request.status !== "Awaiting Payment") {
    return res.status(400).json({ message: "Request is not awaiting payment" });
  }
  if (!request.paymentRequired || request.totalAmount <= 0) {
    return res.status(400).json({ message: "Payment is not required for this request" });
  }
  if (!req.user.paymentCard?.last4) {
    return res.status(400).json({ message: "Add a payment card in your profile" });
  }
  if (req.user.walletBalance < request.totalAmount) {
    return res.status(400).json({ message: "Insufficient account balance" });
  }
  req.user.walletBalance = Number((req.user.walletBalance - request.totalAmount).toFixed(2));
  await req.user.save();
  request.paymentStatus = "Paid";
  request.status = "Waiting for Delivery";
  await request.save();

  await Notification.create({
    title: "Grocery Payment Received",
    message: `${req.user.name} paid for ${request.item} (Qty: ${request.quantity}). Total: LKR ${request.totalAmount.toFixed(2)}.`,
    type: "grocery",
    role: "admin",
    createdBy: req.user._id
  });

  res.json(request);
});

router.patch("/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
  const parse = statusSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const request = await GroceryRequest.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }
  if (request.status === "Delivered") {
    return res.status(400).json({ message: "Delivered requests are locked" });
  }
  if (request.requestType === "stock" && ["Pending Admin Review", "Awaiting Payment"].includes(parse.data.status)) {
    return res.status(400).json({ message: "Invalid status for stock request" });
  }
  if (parse.data.status === "Awaiting Payment" && (!request.paymentRequired || request.pricePerUnit <= 0)) {
    return res.status(400).json({ message: "Pricing must be set before awaiting payment" });
  }
  if (["Waiting for Delivery", "Delivered"].includes(parse.data.status) && request.paymentStatus !== "Paid") {
    return res.status(400).json({ message: "Payment is required before delivery" });
  }
  if (parse.data.status === "Delivered" && request.stockId) {
    const stock = await GroceryStock.findById(request.stockId);
    if (!stock) {
      return res.status(404).json({ message: "Stock item not found" });
    }
    if (stock.quantity < request.quantity) {
      return res.status(400).json({ message: "Insufficient stock to deliver" });
    }
    stock.quantity -= request.quantity;
    await stock.save();
  }
  request.status = parse.data.status;
  await request.save();
  res.json(request);
});

router.delete("/:id/admin", requireAuth, requireRole("admin"), async (req, res) => {
  const request = await GroceryRequest.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }
  await request.deleteOne();
  res.json({ message: "Deleted" });
});

router.delete("/:id", requireAuth, requireApproved, async (req, res) => {
  const request = await GroceryRequest.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }
  if (request.studentId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized to delete this request" });
  }
  if (request.status !== "Pending Admin Review") {
    return res.status(400).json({ message: "Can only delete pending requests" });
  }
  await request.deleteOne();
  res.json({ message: "Deleted" });
});

export default router;
