const express = require('express');
const router = express.Router();
const User = require('../models/user');
const UserActivity = require('../models/userActivity');
const auth = require('../middleware/auth');

// Get user activity report
router.get('/user-activity', auth, async (req, res) => {
    try {
        // Get all users with their activities
        const users = await User.find().select('-password');
        const userActivities = await UserActivity.find()
            .populate('user', 'name email')
            .sort({ timestamp: -1 });

        // Format the data
        const report = users.map(user => {
            const activities = userActivities
                .filter(activity => activity.user._id.toString() === user._id.toString())
                .map(activity => ({
                    type: activity.activityType,
                    timestamp: activity.timestamp,
                    ipAddress: activity.ipAddress,
                    userAgent: activity.userAgent
                }));

            return {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    age: user.age
                },
                activities,
                totalLogins: activities.filter(a => a.type === 'login').length,
                lastLogin: activities.find(a => a.type === 'login')?.timestamp || null
            };
        });

        res.json(report);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get user statistics
router.get('/user-stats', auth, async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            totalLogins: await UserActivity.countDocuments({ activityType: 'login' }),
            recentActivities: await UserActivity.find()
                .populate('user', 'name email')
                .sort({ timestamp: -1 })
                .limit(10)
        };

        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router; 