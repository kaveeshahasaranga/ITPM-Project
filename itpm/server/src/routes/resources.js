import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireApproved } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import Resource from "../models/Resource.js";

const router = Router();

router.get("/", requireAuth, requireApproved, async (_req, res) => {
  const resources = await Resource.find().sort({ name: 1 });
  res.json(resources);
});

const createSchema = z.object({
  name: z.string().min(2).max(100),
  active: z.boolean().optional()
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const resource = await Resource.create({
    name: parse.data.name,
    active: parse.data.active ?? true
  });
  res.status(201).json(resource);
});

const updateSchema = z.object({
  active: z.boolean()
});

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const resource = await Resource.findByIdAndUpdate(
    req.params.id,
    { active: parse.data.active },
    { new: true }
  );
  if (!resource) {
    return res.status(404).json({ message: "Resource not found" });
  }
  res.json(resource);
});

export default router;
