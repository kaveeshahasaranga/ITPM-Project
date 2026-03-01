import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./src/models/User.js";

const MONGODB_URI = "mongodb://localhost:27017/hostelmate";

async function checkAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");
    
    const admin = await User.findOne({ email: "admin@hostelmate.local" });
    
    if (!admin) {
      console.log("❌ Admin user NOT found in database");
      console.log("Run: npm run seed");
      await mongoose.disconnect();
      return;
    }
    
    console.log("✅ Admin user found");
    console.log("   Email:", admin.email);
    console.log("   Name:", admin.name);
    console.log("   Role:", admin.role);
    console.log("   Status:", admin.status);
    
    // Test password
    const testPassword = "Admin@123";
    const isValid = await bcrypt.compare(testPassword, admin.passwordHash);
    
    console.log("\n🔑 Password test:");
    console.log("   Testing password:", testPassword);
    console.log("   Result:", isValid ? "✅ VALID" : "❌ INVALID");
    
    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkAdmin();
