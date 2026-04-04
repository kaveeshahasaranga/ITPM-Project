import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import helmet from "helmet";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";
import dashboardRoutes from "./routes/dashboard.js";
import maintenanceRoutes from "./routes/maintenance.js";
import noticeRoutes from "./routes/notices.js";
import announcementRoutes from "./routes/announcements.js";
import resourceRoutes from "./routes/resources.js";
import bookingRoutes from "./routes/bookings.js";
import groceryRoutes from "./routes/grocery.js";
import todoRoutes from "./routes/todos.js";
import expenseRoutes from "./routes/expenses.js";
import visitorRoutes from "./routes/visitors.js";
import notificationRoutes from "./routes/notifications.js";
import messageRoutes from "./routes/messages.js";
import { notFound, errorHandler } from "./middleware/errors.js";
import { securityHeaders, apiLimiter, sanitizeInput } from "./middleware/security.js";
import { validateEnv } from "./config/env.js";

dotenv.config();

// Validate environment variables
const env = validateEnv();

const app = express();

// Security middleware
app.use(helmet());
app.use(securityHeaders);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(sanitizeInput);

// Minimal logging
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  next();
});

app.get("/api/health", (_req, res) => {
  console.log("[HEALTH] Endpoint called");
  try {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[HEALTH ERROR]", err);
    res.status(500).json({ error: err.message });
  }
});

// Apply rate limiting to all API routes
app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/grocery", groceryRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/visitors", visitorRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hostelmate";

console.log(`[DEBUG] Attempting to connect to MongoDB at: ${MONGODB_URI}`);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("[DEBUG] MongoDB connected successfully");
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`[DEBUG] Server is now accepting connections on http://localhost:${PORT}`);
      console.log(`[DEBUG] Server listening state:`, server.listening);
    });

    server.on('error', (err) => {
      console.error('[ERROR] Server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });

    server.on('listening', () => {
      console.log('[DEBUG] Server listening event fired');
    });
  })
  .catch((err) => {
    console.error("[ERROR] Mongo connection failed:", err.message);
    console.error(err);
    process.exit(1);
  });

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[CRITICAL] Unhandled rejection:', err);
});

// trigger restart
