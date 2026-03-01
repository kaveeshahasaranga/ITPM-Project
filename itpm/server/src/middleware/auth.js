import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const user = await User.findById(payload.id).populate("roomId");
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireApproved(req, res, next) {
  if (req.user.role === "student" && req.user.status !== "approved") {
    return res.status(403).json({ message: "Account awaiting approval" });
  }
  next();
}
