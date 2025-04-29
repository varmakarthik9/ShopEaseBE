const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const Cart = require('../models/cart');
const auth = require('../middleware/auth');

// Create a new order (checkout)
router.post('/checkout', auth, async (req, res) => {
    try {
        const { shippingAddress, paymentMethod } = req.body;

        // Validate required fields
        if (!shippingAddress || !paymentMethod) {
            return res.status(400).json({ message: 'Shipping address and payment method are required' });
        }

        // Get user's cart
        const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        // Create order items from cart items
        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            price: item.product.price
        }));

        // Create new order
        const order = new Order({
            user: req.user.id,
            items: orderItems,
            totalPrice: cart.totalPrice,
            shippingAddress,
            paymentMethod
        });

        // Save the order
        await order.save();

        // Clear the cart
        cart.items = [];
        cart.totalPrice = 0;
        await cart.save();

        res.status(201).json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get Sales Analytics
router.get('/analytics', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required' });
        }

        // Get all orders with populated product details
        const orders = await Order.find()
            .populate('items.product', 'title price category')
            .sort({ createdAt: -1 });

        if (!orders || orders.length === 0) {
            return res.json({
                topProducts: [],
                categorySales: [],
                monthlySales: []
            });
        }

        // Calculate top products
        const productSales = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.product) {
                    const productId = item.product._id.toString();
                    if (!productSales[productId]) {
                        productSales[productId] = {
                            title: item.product.title,
                            quantity: 0
                        };
                    }
                    productSales[productId].quantity += item.quantity;
                }
            });
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        // Calculate sales by category
        const categorySales = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.product && item.product.category) {
                    const category = item.product.category;
                    if (!categorySales[category]) {
                        categorySales[category] = 0;
                    }
                    categorySales[category] += item.price * item.quantity;
                }
            });
        });

        // Format category sales
        const formattedCategorySales = Object.entries(categorySales).map(([category, total]) => ({
            category,
            total: parseFloat(total.toFixed(2))
        }));

        // Calculate monthly sales
        const monthlySales = {};
        orders.forEach(order => {
            const month = new Date(order.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!monthlySales[month]) {
                monthlySales[month] = 0;
            }
            monthlySales[month] += order.totalPrice;
        });

        // Format monthly sales
        const formattedMonthlySales = Object.entries(monthlySales).map(([month, total]) => ({
            month,
            total: parseFloat(total.toFixed(2))
        }));

        res.json({
            topProducts,
            categorySales: formattedCategorySales,
            monthlySales: formattedMonthlySales
        });
    } catch (err) {
        console.error('Error in analytics:', err);
        res.status(500).json({ message: 'Error generating analytics data' });
    }
});

// Get user's orders
router.get('/', auth, async (req, res) => {
    try {
        let query = {};
        
        // If user query parameter is provided and requester is admin, get orders for that user
        if (req.query.user && req.user.role === 'admin') {
            query.user = req.query.user;
        } else {
            // Otherwise, get orders for the authenticated user
            query.user = req.user.id;
        }

        const orders = await Order.find(query)
            .populate('items.product', 'title price images')
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
            
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get order by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.product', 'title price images')
            .populate('user', 'name email');
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if the order belongs to the user
        if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update order status
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        
        // Validate status
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        order.status = status;
        await order.save();

        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router; 