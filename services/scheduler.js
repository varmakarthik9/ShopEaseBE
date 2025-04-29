const cron = require('node-cron');
const { sendDailyEmails } = require('./emailService');

// Schedule the email task to run every day at 6:10 PM
const scheduleDailyEmails = () => {
    cron.schedule('43 18 * * *', async () => {
        console.log('Running daily email task at 6:10 PM...');
        await sendDailyEmails();
    });
};

module.exports = { scheduleDailyEmails };