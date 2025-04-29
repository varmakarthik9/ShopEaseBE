const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Chat = require('../models/chat');

const wss = new WebSocket.Server({ noServer: true });
const onlineUsers = new Map(); // Map of userId to WebSocket connection

wss.on('connection', async (ws, request) => {
    let userId = null;
    try {
        // Extract token from query parameters
        const url = new URL(request.url, 'ws://localhost');
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

                if (data.type === 'message') {
                    const recipientId = data.recipientId;
                    const recipientWs = onlineUsers.get(recipientId);

                    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
                        recipientWs.send(JSON.stringify({
                            type: 'message',
                            senderId: userId,
                            content: data.content,
                            timestamp: new Date()
                        }));
                    }
                }
            } catch (error) {
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
            if (userId) {
                onlineUsers.delete(userId);
                broadcastOnlineStatus(userId);
            }
        });

    } catch (error) {
        ws.close();
    }
});

// Function to broadcast online status to all connected clients
function broadcastOnlineStatus(excludeUserId = null) {
    const onlineStatus = Array.from(onlineUsers.keys());

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'onlineStatus',
                onlineUsers: onlineStatus
            }));
        }
    });
}

module.exports = wss; 