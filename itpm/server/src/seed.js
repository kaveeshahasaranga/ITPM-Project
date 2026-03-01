import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hostelmate";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@hostelmate.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log("Admin already exists");
    await mongoose.disconnect();
    return;
  }
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.create({
    name: "Hostel Admin",
    email: ADMIN_EMAIL,
    passwordHash,
    role: "admin",
    status: "approved"
  });
  console.log("Admin created");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
