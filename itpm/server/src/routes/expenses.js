import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireApproved } from "../middleware/auth.js";
import Expense from "../models/Expense.js";

const router = Router();

const createSchema = z.object({
  title: z.string().min(2).max(100),
  amount: z.number().positive().max(999999),
  category: z.string().min(2).max(50).optional(),
  date: z.string().datetime("Invalid date format").optional()
});

router.get("/", requireAuth, requireApproved, async (req, res) => {
  const expenses = await Expense.find({ studentId: req.user._id }).sort({ date: -1 });
  res.json(expenses);
});

router.post("/", requireAuth, requireApproved, async (req, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const expense = await Expense.create({
    studentId: req.user._id,
    title: parse.data.title,
    amount: parse.data.amount,
    category: parse.data.category,
    date: parse.data.date ? new Date(parse.data.date) : new Date()
  });
  res.status(201).json(expense);
});

router.delete("/:id", requireAuth, requireApproved, async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) {
    return res.status(404).json({ message: "Expense not found" });
  }
  if (expense.studentId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Forbidden" });
  }
  await expense.deleteOne();
  res.json({ message: "Deleted" });
});

export default router;
