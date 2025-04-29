const mongoose = require('mongoose');
const Product = require('./models/product');
require('dotenv').config();

const products = [
    {
        title: "Premium Wireless Headphones",
        description: "High-quality wireless headphones with noise cancellation and 30-hour battery life.",
        price: 199.99,
        category: "Electronics",
        images: [
            "https://images.unsplash.com/photo-1505740420928-5e0c7e9a0c1d",
            "https://images.unsplash.com/photo-1505740420928-5e0c7e9a0c1d",
            "https://images.unsplash.com/photo-1505740420928-5e0c7e9a0c1d"
        ]
    },
    {
        title: "Smart Fitness Watch",
        description: "Track your fitness goals with this advanced smartwatch featuring heart rate monitoring and GPS.",
        price: 149.99,
        category: "Electronics",
        images: [
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30"
        ]
    },
    {
        title: "Professional Camera",
        description: "Capture stunning photos with this professional-grade DSLR camera.",
        price: 899.99,
        category: "Electronics",
        images: [
            "https://images.unsplash.com/photo-1502920917128-1aa500764cbd",
            "https://images.unsplash.com/photo-1502920917128-1aa500764cbd",
            "https://images.unsplash.com/photo-1502920917128-1aa500764cbd"
        ]
    },
    {
        title: "Designer Handbag",
        description: "Elegant designer handbag made from premium leather with multiple compartments.",
        price: 299.99,
        category: "Fashion",
        images: [
            "https://images.unsplash.com/photo-1584917865442-52937b541b8d",
            "https://images.unsplash.com/photo-1584917865442-52937b541b8d",
            "https://images.unsplash.com/photo-1584917865442-52937b541b8d"
        ]
    },
    {
        title: "Running Shoes",
        description: "Lightweight and comfortable running shoes with advanced cushioning technology.",
        price: 129.99,
        category: "Sports",
        images: [
            "https://images.unsplash.com/photo-1542604000-94fb385c6cde",
            "https://images.unsplash.com/photo-1542604000-94fb385c6cde",
            "https://images.unsplash.com/photo-1542604000-94fb385c6cde"
        ]
    },
    {
        title: "Smart Home Speaker",
        description: "Voice-controlled smart speaker with premium sound quality and smart home integration.",
        price: 179.99,
        category: "Electronics",
        images: [
            "https://images.unsplash.com/photo-1589003077984-894e133dabab",
            "https://images.unsplash.com/photo-1589003077984-894e133dabab",
            "https://images.unsplash.com/photo-1589003077984-894e133dabab"
        ]
    },
    {
        title: "Coffee Maker",
        description: "Automatic coffee maker with programmable settings and thermal carafe.",
        price: 89.99,
        category: "Home",
        images: [
            "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e0",
            "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e0",
            "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e0"
        ]
    },
    {
        title: "Yoga Mat",
        description: "Eco-friendly yoga mat with non-slip surface and carrying strap.",
        price: 39.99,
        category: "Sports",
        images: [
            "https://images.unsplash.com/photo-1571902943202-507ec2618e8f",
            "https://images.unsplash.com/photo-1571902943202-507ec2618e8f",
            "https://images.unsplash.com/photo-1571902943202-507ec2618e8f"
        ]
    },
    {
        title: "Smartphone",
        description: "Latest smartphone with high-resolution camera and long battery life.",
        price: 799.99,
        category: "Electronics",
        images: [
            "https://images.unsplash.com/photo-1598327105666-5b89351aff97",
            "https://images.unsplash.com/photo-1598327105666-5b89351aff97",
            "https://images.unsplash.com/photo-1598327105666-5b89351aff97"
        ]
    },
    {
        title: "Blender",
        description: "Powerful blender for smoothies, soups, and more with multiple speed settings.",
        price: 69.99,
        category: "Home",
        images: [
            "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
            "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
            "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158"
        ]
    }
];

mongoose.connect(process.env.DATABASE_URL)
    .then(async () => {
        console.log('Connected to MongoDB');
        
        // Clear existing products
        await Product.deleteMany({});
        console.log('Cleared existing products');
        
        // Insert sample products
        await Product.insertMany(products);
        console.log('Added sample products');
        
        mongoose.connection.close();
    })
    .catch(err => {
        console.error('Error seeding database:', err);
        mongoose.connection.close();
    }); 