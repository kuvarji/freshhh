const mongoose = require("mongoose");
const Product = require("./models/Product");
const User = require("./models/User");
const connectDB = require("./config/db");

connectDB();

const sampleProducts = [
    { name: "Fresh Oranges", category: "fruits", emoji: "🍊", price: 4.99, comparePrice: 6.99, unit: "1 kg", stock: 50, featured: true },
    { name: "Organic Bananas", category: "fruits", emoji: "🍌", price: 2.99, unit: "1 bunch", stock: 100, featured: true },
    { name: "Red Apples", category: "fruits", emoji: "🍎", price: 5.99, comparePrice: 7.99, unit: "1 kg", stock: 75, featured: true },
    { name: "Fresh Carrots", category: "vegetables", emoji: "🥕", price: 3.49, unit: "500g", stock: 60, featured: true },
    { name: "Broccoli", category: "vegetables", emoji: "🥦", price: 4.49, unit: "1 head", stock: 40, featured: true },
    { name: "Fresh Milk", category: "dairy", emoji: "🥛", price: 3.99, unit: "1 liter", stock: 80, featured: true },
    { name: "Cheese", category: "dairy", emoji: "🧀", price: 6.99, unit: "250g", stock: 35, featured: false },
    { name: "Fresh Bread", category: "bakery", emoji: "🍞", price: 2.49, unit: "1 loaf", stock: 90, featured: false },
];

const seedData = async () => {
    try {
        await Product.deleteMany();
        await Product.insertMany(sampleProducts);

        // Create admin user
        const adminExists = await User.findOne({ email: "admin@freshmart.com" });
        if (!adminExists) {
            await User.create({
                name: "Admin",
                email: "admin@freshmart.com",
                password: "admin123",
                role: "admin",
            });
        }

        console.log("Data seeded successfully!");
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedData();