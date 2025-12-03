const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true,
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            enum: ["fruits", "vegetables", "dairy", "bakery", "meat", "beverages"],
        },
        emoji: {
            type: String,
            required: true,
            default: "🛒",
        },
        price: {
            type: Number,
            required: [true, "Price is required"],
            min: 0,
        },
        comparePrice: {
            type: Number,
            min: 0,
            default: null,
        },
        unit: {
            type: String,
            required: [true, "Unit is required"],
            trim: true,
        },
        stock: {
            type: Number,
            required: [true, "Stock is required"],
            min: 0,
            default: 0,
        },
        featured: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Product", productSchema);