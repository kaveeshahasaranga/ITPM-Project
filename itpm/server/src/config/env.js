import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("4000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required").default("mongodb://localhost:27017/hostelmate"),
  JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 characters"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  ADMIN_EMAIL: z.string().email("Invalid admin email").default("admin@hostelmate.local"),
  ADMIN_PASSWORD: z.string().min(6, "Admin password must be at least 6 characters").default("Admin@123"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.string().optional().default(""),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default(""),
  SMTP_SECURE: z.string().optional().default("false")
});

export function validateEnv() {
  try {
    const validated = envSchema.parse({
      PORT: process.env.PORT,
      MONGODB_URI: process.env.MONGODB_URI,
      JWT_SECRET: process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV,
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      SMTP_FROM: process.env.SMTP_FROM,
      SMTP_SECURE: process.env.SMTP_SECURE
    });

    // Warn about insecure defaults
    if (validated.JWT_SECRET === "secret") {
      console.warn("⚠️  WARNING: Using default JWT_SECRET. This is insecure in production!");
    }

    if (validated.NODE_ENV === "production" && validated.MONGODB_URI.includes("localhost")) {
      console.warn("⚠️  WARNING: Using localhost MongoDB in production!");
    }

    console.log("✅ Environment variables validated successfully");
    return validated;
  } catch (error) {
    console.error("❌ Environment validation failed:");
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}
