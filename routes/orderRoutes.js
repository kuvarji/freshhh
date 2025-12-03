const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const { delivery } = require("../middleware/deliveryMiddleware");
const deliveryController = require("../controllers/deliveryController");

// Get all orders (Admin)
router.get("/", protect, admin, async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate("user", "name email")
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error("Get all orders error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// Get user orders
router.get("/my-orders", protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({
            createdAt: -1,
        });
        res.json(orders);
    } catch (error) {
        console.error("Get my orders error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


// POST / (Create Order Route)
router.post("/", protect, async (req, res) => {
    try {
        const {
            items,
            total,
            deliveryName,
            deliveryPhone,
            deliveryAddress,
            deliveryCity,
            deliveryZip,
            paymentMethod,
        } = req.body;

        // Normalize and trim string inputs
        const norm = (v) => (typeof v === 'string' ? v.trim() : v);
        const dName = norm(deliveryName) || null;
        const dPhone = norm(deliveryPhone) || null;
        const dAddress = norm(deliveryAddress) || null;
        const dCity = norm(deliveryCity) || null;
        const dZip = norm(deliveryZip) || null;
        const dNotes = norm(req.body.deliveryNotes) || '';

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "No order items" });
        }

        // Validation check for items
        for (const item of items) {
            if (!item.product || !item.name || item.price <= 0 || item.quantity <= 0) {
                return res.status(400).json({ message: "Invalid item details" });
            }
        }

        // Provide safe defaults for required delivery fields if input is empty
        const safeDeliveryName = dName || (req.user && req.user.name) || 'Guest';
        const safeDeliveryPhone = dPhone || '0000000000';
        const safeDeliveryAddress = dAddress || 'Address not provided';
        const safeDeliveryCity = dCity || 'Unknown';
        const safeDeliveryZip = dZip || '000000';

        // Generate order number
        const orderNumber = "ORD" + Date.now() + Math.floor(Math.random() * 1000);

        const orderPayload = {
            user: req.user?._id,
            orderNumber,
            items,
            total: typeof total === 'number' ? total : Number(total) || 0,
            deliveryName: safeDeliveryName,
            deliveryPhone: safeDeliveryPhone,
            deliveryAddress: safeDeliveryAddress,
            deliveryCity: safeDeliveryCity,
            deliveryZip: safeDeliveryZip,
            deliveryNotes: dNotes,
            deliveryLat: req.body.deliveryLat || null,
            deliveryLng: req.body.deliveryLng || null,
            paymentMethod: paymentMethod || 'cod',
        };

        // If payment was completed via PayPal, mark paid
        if (orderPayload.paymentMethod === 'paypal' && req.body.paymentResult) {
            orderPayload.isPaid = true;
            orderPayload.paidAt = new Date();
            orderPayload.paymentResult = req.body.paymentResult;
        }

        // --- Create the order FIRST ---
        let order = await Order.create(orderPayload);

        // --- Generate and send OTP (New Logic) ---
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        order.otpCode = otp;
        order.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
        order.otpVerified = false;

        // Save the order again to persist the OTP details
        await order.save();

        // Attempt to send OTP via Twilio
        let otpSent = false;
        try {
            const TW_SID = process.env.TWILIO_ACCOUNT_SID;
            const TW_TOKEN = process.env.TWILIO_AUTH_TOKEN;
            const TW_FROM = process.env.TWILIO_FROM;

            if (TW_SID && TW_TOKEN && TW_FROM) {
                // Check if Twilio module is installed and required
                const Twilio = require('twilio');
                const client = Twilio(TW_SID, TW_TOKEN);
                await client.messages.create({
                    body: `Your FreshMart delivery verification code is ${otp}. It expires in 10 minutes.`,
                    from: TW_FROM,
                    to: order.deliveryPhone,
                });
                otpSent = true;
                console.log('OTP sent via Twilio to', order.deliveryPhone);
            }
        } catch (e) {
            console.error('Twilio send error:', e.message);
        }

        // If OTP wasn't sent (e.g., missing keys or Twilio not installed), log it.
        if (!otpSent) {
            console.log('Twilio configuration incomplete or failed. OTP not sent. OTP code is:', otp);
            // This was the missing closing brace that caused your original error:
        }
        // --- END OTP Logic ---

        // Return the order object
        res.status(201).json({ ...order.toObject(), otpSent });

    } catch (error) {
        console.error("Create order error:", error.message, error.stack);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: "Validation failed", errors: errors });
        }
        res.status(500).json({ message: "Server error creating order", error: error.message });
    }
});


// Update order status (the rest of your original code)
router.put("/:id/status", protect, admin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        order.status = status;
        const updatedOrder = await order.save();

        // Socket.io logic
        try {
            const io = req.app.get('io');
            if (io && updatedOrder.user) {
                io.to(updatedOrder.user.toString()).emit('orderUpdated', updatedOrder);
            }
        } catch (e) {
            console.error('Socket emit error:', e.message);
        }
        res.json(updatedOrder);

    } catch (error) {
        console.error("Update order status error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// ===== Delivery routes for delivery users =====
// Get orders assigned to logged-in delivery boy
router.get('/delivery/assigned', protect, delivery, deliveryController.getAssignedOrders);

// Delivery: generate OTP for a specific order (delivery user must be assigned)
router.post('/delivery/:id/generate-otp', protect, delivery, deliveryController.generateOtp);

// Delivery: verify OTP and mark delivered
router.post('/delivery/:id/verify-otp', protect, delivery, deliveryController.verifyOtp);

// Delivery: update non-delivered statuses (e.g., out_for_delivery)
router.put('/delivery/:id/status', protect, delivery, deliveryController.updateStatus);

// Admin: assign a delivery user to an order
router.put('/:id/assign', protect, admin, async (req, res) => {
    try {
        const { deliveryBoyId } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (deliveryBoyId) {
            const User = require('../models/User');
            const user = await User.findById(deliveryBoyId);
            if (!user) return res.status(404).json({ message: 'Delivery user not found' });
            if (user.role !== 'delivery') return res.status(400).json({ message: 'User is not a delivery user' });

            order.deliveryBoy = user._id;
        } else {
            // Unassign
            order.deliveryBoy = null;
        }

        const updated = await order.save();

        // Populate deliveryBoy and user for client
        const populated = await Order.findById(updated._id).populate('deliveryBoy', 'name email').populate('user', 'name email');

        // Emit socket update to user if available
        try {
            const io = req.app.get('io');
            if (io && populated.user) io.to(populated.user._id.toString()).emit('orderUpdated', populated);
        } catch (e) {
            console.error('Socket emit error on assign:', e.message);
        }

        res.json(populated);
    } catch (error) {
        console.error('Assign delivery error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


// CRITICAL: You must export the router instance at the very end of the file.
module.exports = router;

