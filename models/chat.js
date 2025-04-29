const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    read: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // This will add createdAt and updatedAt fields
});

// Add indexes for better query performance
chatSchema.index({ sender: 1, recipient: 1 });
chatSchema.index({ timestamp: 1 });

module.exports = mongoose.model('Chat', chatSchema); 