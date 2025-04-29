const jwt = require('jsonwebtoken');
const TokenBlacklist = require('../models/tokenBlacklist');
const User = require('../models/user');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No authentication token, access denied' });
        }

        // Check if token is blacklisted
        const blacklistedToken = await TokenBlacklist.findOne({ token });
        if (blacklistedToken) {
            return res.status(401).json({ message: 'Token has been invalidated' });
        }

        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user with role
        const user = await User.findById(verified.id);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = {
            id: user._id,
            email: user.email,
            role: user.role
        };
        
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token verification failed, authorization denied' });
    }
};

module.exports = auth; 