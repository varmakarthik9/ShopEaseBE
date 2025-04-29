const express = require('express');
const router = express.Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { sendWelcomeEmail } = require('../services/emailService');
const TokenBlacklist = require('../models/tokenBlacklist');
const UserActivity = require('../models/userActivity');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Initialize Twilio client
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create and sign token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Record login activity
        await UserActivity.create({
            user: user._id,
            activityType: 'login',
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({ 
            token, 
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email,
                role: user.role 
            } 
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Logout route
router.post('/logout', auth, async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(400).json({ message: 'No token provided' });
        }

        // Decode token to get expiration time
        const decoded = jwt.decode(token);
        const expiresAt = new Date(decoded.exp * 1000);

        // Add token to blacklist
        await TokenBlacklist.create({
            token,
            expiresAt
        });

        // Record logout activity
        await UserActivity.create({
            user: req.user.id,
            activityType: 'logout',
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({ message: 'Successfully logged out' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all users (admin only)
router.get('/', auth, admin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get a single user (protected)
router.get('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Allow access if user is requesting their own data or is an admin
        if (user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new user (register)
router.post('/register', async (req, res) => {
    const user = new User({
        name: req.body.name,
        email: req.body.email,
        age: req.body.age,
        password: req.body.password,
        role: req.body.role || 'user' // Default to 'user' if no role provided
    });

    try {
        const newUser = await user.save();
        const token = jwt.sign(
            { id: newUser._id, email: newUser.email, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Send welcome email
        await sendWelcomeEmail(newUser);

        res.status(201).json({ 
            token, 
            user: { 
                id: newUser._id, 
                name: newUser.name, 
                email: newUser.email,
                role: newUser.role 
            } 
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a user (protected)
router.put('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Only allow users to update their own data or admins to update any data
        if (user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Only admins can change roles
        if (req.body.role && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can change roles' });
        }

        // Update user fields
        if (req.body.name != null) user.name = req.body.name;
        if (req.body.email != null) user.email = req.body.email;
        if (req.body.age != null) user.age = req.body.age;
        if (req.body.phone != null) user.phone = req.body.phone;
        if (req.body.password != null) user.password = req.body.password;
        if (req.body.role != null && req.user.role === 'admin') user.role = req.body.role;

        const updatedUser = await user.save();
        res.json(updatedUser);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a user (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        await user.remove();
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Send email to user
router.post('/:id/send-email', auth, async (req, res) => {
    try {
        const { subject, message } = req.body;
        
        // Validate required fields
        if (!subject || !message) {
            return res.status(400).json({ message: 'Subject and message are required' });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Send email using nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: subject,
            text: message
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: 'Email sent successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Send SMS to user
router.post('/:id/send-sms', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can send SMS' });
        }

        const { phoneNumber, message } = req.body;

        // Validate required fields
        if (!phoneNumber || !message) {
            return res.status(400).json({ message: 'Phone number and message are required' });
        }

        // Validate phone number format
        if (!/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
            return res.status(400).json({ message: 'Invalid phone number format' });
        }

        // Find user
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Send SMS using Twilio
        try {
            await twilioClient.messages.create({
                body: message,
                to: phoneNumber,
                from: process.env.TWILIO_PHONE_NUMBER
            });

            res.status(200).json({ message: 'SMS sent successfully' });
        } catch (twilioError) {
            console.error('Twilio error:', twilioError);
            res.status(500).json({ message: 'Failed to send SMS: ' + twilioError.message });
        }
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;