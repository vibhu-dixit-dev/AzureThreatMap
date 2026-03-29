const cron = require('node-cron');
const User = require('../models/User');

const initSubscriptionCron = () => {
  // Run every night at 12:00 AM
  cron.schedule('0 0 * * *', async () => {
    console.log('⏳ Running daily subscription update...');
    try {
      // Decrement subscriptionDays for all users who have days left
      const result = await User.updateMany(
        { subscriptionDays: { $gt: 0 } },
        { $inc: { subscriptionDays: -1 } }
      );
      console.log(`✅ Subscription days updated for ${result.modifiedCount} users.`);
    } catch (err) {
      console.error('❌ Error running subscription cron:', err);
    }
  });
};

module.exports = { initSubscriptionCron };
