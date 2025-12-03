const connectDB = require('../config/db');
const User = require('../models/User');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/checkUser.js user@example.com');
  process.exit(1);
}

(async () => {
  try {
    await connectDB();
    const user = await User.findOne({ email }).lean();
    if (!user) {
      console.log('User not found:', email);
      process.exit(0);
    }
    console.log('User:', { _id: user._id, email: user.email, role: user.role, createdAt: user.createdAt });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
