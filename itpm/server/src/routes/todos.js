import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireApproved } from "../middleware/auth.js";
import Todo from "../models/Todo.js";

const router = Router();

const createSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  dueDate: z.string().datetime("Invalid date format").optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional()
});

router.post("/", requireAuth, requireApproved, async (req, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const todo = await Todo.create({
    studentId: req.user._id,
    ...parse.data,
    dueDate: parse.data.dueDate ? new Date(parse.data.dueDate) : undefined
  });
  res.status(201).json(todo);
});

router.get("/", requireAuth, requireApproved, async (req, res) => {
  const todos = await Todo.find({ studentId: req.user._id }).sort({ dueDate: 1 });
  res.json(todos);
});

const updateSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(["Pending", "In Progress", "Completed"]).optional(),
  dueDate: z.string().datetime("Invalid date format").optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional()
});

router.patch("/:id", requireAuth, requireApproved, async (req, res) => {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const todo = await Todo.findById(req.params.id);
  if (!todo || todo.studentId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ message: "Todo not found" });
  }
  Object.assign(todo, parse.data);
  if (parse.data.dueDate) {
    todo.dueDate = new Date(parse.data.dueDate);
  }
  await todo.save();
  res.json(todo);
});

router.delete("/:id", requireAuth, requireApproved, async (req, res) => {
  const todo = await Todo.findById(req.params.id);
  if (!todo || todo.studentId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ message: "Todo not found" });
  }
  await todo.deleteOne();
  res.json({ message: "Deleted" });
});

export default router;
