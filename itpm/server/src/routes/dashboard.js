import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import User from "../models/User.js";
import MaintenanceRequest from "../models/MaintenanceRequest.js";
import GroceryRequest from "../models/GroceryRequest.js";
import Booking from "../models/Booking.js";
import Todo from "../models/Todo.js";
import Expense from "../models/Expense.js";

const router = Router();

router.get("/statistics", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const [
      totalStudents,
      pendingStudents,
      approvedStudents,
      pendingMaintenance,
      inProgressMaintenance,
      pendingGrocery,
      totalBookings,
      upcomingBookings,
      completedTodos,
      totalTodos,
      thisMonthExpenses
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "student", status: "pending" }),
      User.countDocuments({ role: "student", status: "approved" }),
      MaintenanceRequest.countDocuments({ status: "Pending" }),
      MaintenanceRequest.countDocuments({ status: "In Progress" }),
      GroceryRequest.countDocuments({ status: { $in: ["Pending Admin Review", "Awaiting Payment"] } }),
      Booking.countDocuments(),
      Booking.countDocuments({ start: { $gte: new Date() } }),
      Todo.countDocuments({ completed: true }),
      Todo.countDocuments(),
      Expense.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    // Recent activities
    const recentMaintenance = await MaintenanceRequest.find()
      .populate("studentId", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .select("category status createdAt studentId");

    const recentStudents = await User.find({ role: "student" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email status createdAt");

    // Maintenance by category
    const maintenanceByCategory = await MaintenanceRequest.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Maintenance by status
    const maintenanceByStatus = await MaintenanceRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Grocery requests by status
    const groceryByStatus = await GroceryRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    res.json({
      students: {
        total: totalStudents,
        pending: pendingStudents,
        approved: approvedStudents
      },
      maintenance: {
        pending: pendingMaintenance,
        inProgress: inProgressMaintenance,
        byCategory: maintenanceByCategory,
        byStatus: maintenanceByStatus,
        recent: recentMaintenance
      },
      grocery: {
        pending: pendingGrocery,
        byStatus: groceryByStatus
      },
      bookings: {
        total: totalBookings,
        upcoming: upcomingBookings
      },
      todos: {
        completed: completedTodos,
        total: totalTodos,
        pending: totalTodos - completedTodos
      },
      expenses: {
        thisMonth: thisMonthExpenses[0]?.total || 0
      },
      recentActivity: {
        students: recentStudents,
        maintenance: recentMaintenance
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
