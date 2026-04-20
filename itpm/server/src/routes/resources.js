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

