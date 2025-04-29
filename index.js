const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const DBString = process.env.DATABASE_URL
const cors = require('cors');
const usersRouter = require('./routes/user');
const productsRouter = require('./routes/product');
const cartRouter = require('./routes/cart');
const orderRouter = require('./routes/order');
const chatRouter = require('./routes/chat');
const chatWebSocket = require('./websocket/chat');
const { scheduleDailyEmails } = require('./services/scheduler');
const path = require('path');

// Set up the express app
const app = express();
const server = require('http').createServer(app);

// Debug middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

//Routes
app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use('/cart', cartRouter);
app.use('/orders', orderRouter);
app.use('/chat', chatRouter);

// Debug route registration
console.log('Registered routes:');
console.log('- POST /chat/send');
console.log('- GET /chat/history/:userId');
console.log('- GET /chat/unread');

// Serve admin panel
app.get('/admin*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Serve admin login page
app.get('/login*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login', 'index.html'));
});

// WebSocket upgrade handling
server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    console.log('WebSocket upgrade request:', pathname);

    if (pathname === '/chat') {
        chatWebSocket.handleUpgrade(request, socket, head, (ws) => {
            chatWebSocket.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

//DATABASE Connection
mongoose.connect(DBString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: true,
    tlsAllowInvalidCertificates: true
});
const database = mongoose.connection

database.on('error', (error) => {
    console.log(error)
})

database.once('connected', () => {
    console.log('Database Connected');
})

// Initialize the email scheduler
scheduleDailyEmails();
console.log('Email scheduler initialized - will send emails daily at 6:10 PM');

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    console.log('404 - Route not found:', req.method, req.url);
    res.status(404).json({ message: 'Route not found' });
});

//Server Started
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});