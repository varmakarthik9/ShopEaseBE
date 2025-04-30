const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Chat = require('../models/chat');

const wss = new WebSocket.Server({ noServer: true });
const onlineUsers = new Map(); // Map of userId to WebSocket connection
const messageQueue = new Map(); // Map of userId to message queue

module.exports = {
    handleUpgrade(request, socket, head, cb) {
        wss.handleUpgrade(request, socket, head, cb);
    },
    emit(event, ...args) {
        wss.emit(event, ...args);
    },
    on(event, listener) {
        wss.on(event, listener);
    }
};

wss.on('connection', async (ws, request) => {
    let userId = null;
    try {
        // Extract token from query parameters
        const url = new URL(request.url, `http://${request.headers.host}`);
        const token = url.searchParams.get('token');
        
        if (!token) {
            throw new Error('No token provided');
        }

        // Verify token and get user
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            throw new Error('User not found');
        }

        userId = user._id.toString();
        // Store the connection
        onlineUsers.set(userId, ws);

        // Initialize message queue for user
        messageQueue.set(userId, []);

        // Send initial online status to the new connection
        ws.send(JSON.stringify({
            type: 'onlineStatus',
            onlineUsers: Array.from(onlineUsers.keys())
        }));

        // Broadcast updated status to all other clients
        broadcastOnlineStatus(userId);

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                console.log('Received message:', data);

                if (data.type === 'message') {
                    const recipientId = data.recipientId;
                    const recipientWs = onlineUsers.get(recipientId);

                    // Save message to database first
                    const chatMessage = new Chat({
                        sender: userId,
                        recipient: recipientId,
                        content: data.content,
                        timestamp: new Date()
                    });
                    const savedMessage = await chatMessage.save();

                    // Send to recipient if they're online
                    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
                        recipientWs.send(JSON.stringify({
                            type: 'message',
                            senderId: userId,
                            content: data.content,
                            timestamp: savedMessage.timestamp
                        }));
                    }

                    // Add to message queue if recipient is offline
                    if (!recipientWs) {
                        const queue = messageQueue.get(recipientId) || [];
                        queue.push({
                            type: 'message',
                            senderId: userId,
                            content: data.content,
                            timestamp: savedMessage.timestamp
                        });
                        messageQueue.set(recipientId, queue);
                    }
                }
            } catch (error) {
                console.error('Error processing message:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Error processing message'
                }));
            }
        });

        ws.on('close', () => {
            if (userId) {
                onlineUsers.delete(userId);
                broadcastOnlineStatus(userId);
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            if (userId) {
                onlineUsers.delete(userId);
                broadcastOnlineStatus(userId);
            }
        });

    } catch (error) {
        console.error('Connection error:', error);
        ws.close();
    }
});

// Function to broadcast online status to all connected clients
function broadcastOnlineStatus(excludeUserId = null) {
    const onlineStatus = Array.from(onlineUsers.keys());
    console.log('Broadcasting online status:', onlineStatus);

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'onlineStatus',
                onlineUsers: onlineStatus
            }));
        }
    });

    // Check if any messages are queued for online users
    onlineUsers.forEach((ws, userId) => {
        const queue = messageQueue.get(userId);
        if (queue.length > 0) {
            queue.forEach(message => {
                ws.send(JSON.stringify(message));
            });
            messageQueue.set(userId, []);
        }
    });
}