import mongoose from "mongoose";
import Message from "./src/models/Message.js";
import User from "./src/models/User.js";
import Notification from "./src/models/Notification.js";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hostelmate";

async function verify() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        // 1. Find a student and an admin
        const student = await User.findOne({ role: "student" });
        const admin = await User.findOne({ role: "admin" });

        if (!student || !admin) {
            console.log("Skipping verification: Student or Admin not found");
            process.exit(0);
        }

        console.log(`Student: ${student.name} (${student._id})`);
        console.log(`Admin: ${admin.name} (${admin._id})`);

        // 2. Create a message from student to admin through Model (simulating API)
        // In real app, API handles this. Here we verify Model and Notification logic if we were calling controller code?
        // Actually, we can't easily call controller code here without mocking req/res or starting server.
        // So we will just verify that we can CREATE messages and they look right.

        const msg1 = await Message.create({
            sender: student._id,
            content: "Hello Admin, this is a test message",
            type: "personal",
            isStudentToAdmin: true
        });
        console.log("Message created:", msg1._id);

        // 3. Create Notification for admin (simulate controller logic)
        const notif1 = await Notification.create({
            title: "New Message from Student",
            message: `from ${student.name}: Hello Admin...`,
            type: "message",
            role: "admin",
            createdBy: student._id
        });
        console.log("Notification created:", notif1._id);

        // 4. Verify admin can see it (query logic)
        const adminMessages = await Message.find({ isStudentToAdmin: true });
        const found = adminMessages.find(m => m._id.equals(msg1._id));
        if (found) console.log("✅ Admin query works: Admin can see the message");
        else console.log("❌ Admin query failed");

        // 5. Admin replies
        const msg2 = await Message.create({
            sender: admin._id,
            recipient: student._id,
            content: "Hello Student, received.",
            type: "reply",
            isStudentToAdmin: false
        });
        console.log("Reply created:", msg2._id);

        // 6. Verify student can see it (query logic)
        const studentMessages = await Message.find({
            $or: [{ sender: student._id }, { recipient: student._id }]
        });
        const foundReply = studentMessages.find(m => m._id.equals(msg2._id));
        if (foundReply) console.log("✅ Student query works: Student can see the reply");
        else console.log("❌ Student query failed");

        // cleanup
        await Message.deleteMany({ _id: { $in: [msg1._id, msg2._id] } });
        await Notification.deleteMany({ _id: notif1._id });
        console.log("Cleanup done");

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
