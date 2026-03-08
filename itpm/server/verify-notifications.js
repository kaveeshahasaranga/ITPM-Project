import mongoose from "mongoose";
import Notification from "./src/models/Notification.js";
import User from "./src/models/User.js";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hostelmate";

async function verify() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        const student = await User.findOne({ role: "student" });
        if (!student) {
            console.log("Student not found");
            process.exit(0);
        }

        // 1. Create a notification for this student
        const notif = await Notification.create({
            title: "Test Notif",
            message: "Verify mark all read",
            type: "message",
            role: "student",
            recipientId: student._id
        });
        console.log("Notification created:", notif._id);

        // 2. Verify it is unread
        let found = await Notification.findById(notif._id);
        if (!found.read) console.log("✅ Notification is unread");
        else console.log("❌ Notification should be unread");

        // 3. Mark all as read for this student (simulate route logic)
        // Route logic:
        // const result = await Notification.updateMany(
        //   {
        //     read: false,
        //     $or: [
        //       { role: 'student', recipientId: null },
        //       { recipientId: student._id }
        //     ]
        //   },
        //   { $set: { read: true } }
        // );

        // We execute the same query here
        const result = await Notification.updateMany(
            {
                read: false,
                $or: [
                    { role: "student", recipientId: null },
                    { recipientId: student._id }
                ]
            },
            { $set: { read: true } }
        );
        console.log("Marked as read, modified:", result.modifiedCount);

        // 4. Verify it is read
        found = await Notification.findById(notif._id);
        if (found.read) console.log("✅ Notification is now read");
        else console.log("❌ Notification should be read");

        // Cleanup
        await Notification.deleteMany({ _id: notif._id });
        console.log("Cleanup done");

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
