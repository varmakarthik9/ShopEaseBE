const express = require('express');
const router = express.Router();
const Chat = require('../models/chat');
const User = require('../models/user');
const auth = require('../middleware/auth');

// Get chat history with a specific user
router.get('/history/:userId', auth, async (req, res) => {
    try {
        console.log('Fetching chat history for:', {
            currentUser: req.user.id,
            otherUser: req.params.userId
        });

        const messages = await Chat.find({
            $or: [
                { sender: req.user.id, recipient: req.params.userId },
                { sender: req.params.userId, recipient: req.user.id }
            ]
        })
        .sort({ timestamp: 1 })
        .populate('sender', 'name')
        .populate('recipient', 'name');

        console.log('Found messages:', messages.length);

        // Mark messages as read
        await Chat.updateMany(
            { 
                recipient: req.user.id,
                sender: req.params.userId,
                read: false
            },
            { read: true }
        );

        res.json(messages);
    } catch (err) {
        console.error('Error fetching chat history:', err);
        res.status(500).json({ message: err.message });
    }
});

// Send a message
router.post('/send', auth, async (req, res) => {
    try {
        const { recipientId, content } = req.body;

        console.log('Sending message:', {
            sender: req.user.id,
            recipientId,
            content
        });

        // Validate recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            console.error('Recipient not found:', recipientId);
            return res.status(404).json({ message: 'Recipient not found' });
        }

        // Create and save message
        const message = new Chat({
            sender: req.user.id,
            recipient: recipientId,
            content: content,
            timestamp: new Date()
        });

        console.log('Saving message to database:', message);
        const savedMessage = await message.save();
        console.log('Message saved successfully:', savedMessage);

        // Populate sender and recipient details
        const populatedMessage = await Chat.findById(savedMessage._id)
            .populate('sender', 'name')
            .populate('recipient', 'name');

        res.status(201).json(populatedMessage);
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get unread messages count
router.get('/unread', auth, async (req, res) => {
    try {
        const count = await Chat.countDocuments({
            recipient: req.user.id,
            read: false
        });
        res.json({ count });
    } catch (err) {
        console.error('Error getting unread count:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router; 