const nodemailer = require('nodemailer');
const User = require('../models/user');

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Function to send welcome email to new user
const sendWelcomeEmail = async (user) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Welcome to Medium Blog!',
            html: `
                <h1>Welcome to Medium Blog, ${user.name}!</h1>
                <p>Thank you for registering with us. We're excited to have you on board!</p>
                <p>Here's what you can do with your account:</p>
                <ul>
                    <li>Read and write articles</li>
                    <li>Connect with other writers</li>
                    <li>Get daily updates at 6:10 PM</li>
                </ul>
                <p>If you have any questions, feel free to reach out to our support team.</p>
                <p>Best regards,<br>Medium Blog Team</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
        console.error('Error sending welcome email:', error);
    }
};

// Function to send daily email to all users
const sendDailyEmails = async () => {
    try {
        // Get all users
        const users = await User.find({}, 'email name');
        
        // Send email to each user
        for (const user of users) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'Good Morning from Medium Blog!',
                html: `
                    <h1>Good Morning, ${user.name}!</h1>
                    <p>We hope you're having a great day. Here's your daily update from Medium Blog.</p>
                    <p>Don't forget to check out our latest articles and updates.</p>
                    <p>Best regards,<br>Medium Blog Team</p>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log(`Daily email sent to ${user.email}`);
        }
    } catch (error) {
        console.error('Error sending daily emails:', error);
    }
};

module.exports = { sendDailyEmails, sendWelcomeEmail }; 