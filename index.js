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

mongoose.connect(DBString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('Database Connected');

    // Register middleware and routes AFTER DB connects
    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    app.use('/users', usersRouter);
    app.use('/products', productsRouter);
    app.use('/cart', cartRouter);
    app.use('/orders', orderRouter);
    app.use('/chat', chatRouter);

    // Serve static files
    app.get('/admin*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
    });
    app.get('/login*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'login', 'index.html'));
    });

    // WebSocket
    server.on('upgrade', (request, socket, head) => {
        const pathname = new URL(request.url, 'http://localhost').pathname;
        if (pathname === '/chat') {
            chatWebSocket.handleUpgrade(request, socket, head, (ws) => {
                chatWebSocket.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
        }
    });

    // Scheduler
    scheduleDailyEmails();
    console.log('Email scheduler initialized - will send emails daily at 6:10 PM');

    // Error middleware
    app.use((err, req, res, next) => {
        console.error('Error:', err.stack);
        res.status(500).json({ message: 'Something went wrong!' });
    });

    app.use((req, res) => {
        res.status(404).json({ message: 'Route not found' });
    });

    // Start the server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });

})
.catch(err => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
});