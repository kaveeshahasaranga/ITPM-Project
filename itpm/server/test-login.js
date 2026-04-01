import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function test() {
  await mongoose.connect('mongodb://localhost:27017/hostelmate');
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ email: 'admin@hostelmate.local' });
  console.log('User found:', !!user);
  if(user) {
    console.log('Role:', user.role);
    const ok = await bcrypt.compare('Admin@123', user.passwordHash);
    console.log('Password match Admin@123:', ok);
    const ok2 = await bcrypt.compare('Admin@123\r', user.passwordHash);
    console.log('Password match Admin@123\\r:', ok2);
  }
  process.exit(0);
}
test();
