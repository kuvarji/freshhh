const Order = require("../models/Order");
const User = require("../models/User");

// Helper: generate 6-digit OTP
const generate6DigitOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Twilio if configured, otherwise log to console
const sendOtpToCustomer = async (order, otp) => {
    const TW_SID = process.env.TWILIO_ACCOUNT_SID;
    const TW_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TW_FROM = process.env.TWILIO_FROM;

    if (TW_SID && TW_TOKEN && TW_FROM) {
        try {
            const Twilio = require('twilio');
            const client = Twilio(TW_SID, TW_TOKEN);
            await client.messages.create({
                body: `Your FreshMart delivery verification code is ${otp}. It expires in 10 minutes.`,
                from: TW_FROM,
                to: order.deliveryPhone,
            });
            console.log('OTP sent via Twilio to', order.deliveryPhone);
            return true;
        } catch (e) {
            console.error('Twilio send error:', e.message);
            return false;
        }
    }

    // Fallback for development / missing Twilio keys
    console.log(`(DEV) OTP ${otp} for order ${order._id} would be sent to ${order.deliveryPhone}`);
    return false;
};

// Get orders assigned to the logged-in delivery boy
const getAssignedOrders = async (req, res) => {
    try {
        const deliveryBoyId = req.user._id;
        const orders = await Order.find({ deliveryBoy: deliveryBoyId })
            .populate('user', 'name email')
            .populate('deliveryBoy', 'name email')
            .sort({ createdAt: -1 });

        // Return full orders for richer client rendering
        res.json(orders);
    } catch (error) {
        console.error('Get assigned orders error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Generate OTP and send to customer when marking as delivered
const generateOtp = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId).populate('user', 'name email');

        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Check assignment
        if (!order.deliveryBoy || order.deliveryBoy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized for this order' });
        }

        const otp = generate6DigitOtp();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        order.otpCode = otp;
        order.otpExpires = expires;
        order.otpVerified = false;
        await order.save();

        // Send OTP (Twilio if configured)
        const otpSent = await sendOtpToCustomer(order, otp);

        res.json({ message: 'OTP generated', expiresAt: expires, otpSent });
    } catch (error) {
        console.error('Generate OTP error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Verify OTP and mark order delivered
const verifyOtp = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { otp } = req.body;

        if (!otp) return res.status(400).json({ message: 'OTP is required' });

        // Need to explicitly select otp fields because schema marks them with select: false
        const order = await Order.findById(orderId).select('+otpCode +otpExpires');
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (!order.deliveryBoy || order.deliveryBoy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized for this order' });
        }

        if (!order.otpCode || !order.otpExpires) {
            return res.status(400).json({ message: 'No OTP generated for this order' });
        }

        if (new Date() > order.otpExpires) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        if (order.otpCode !== otp.toString()) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        order.otpVerified = true;
        order.status = 'delivered';
        order.otpCode = null;
        order.otpExpires = null;
        await order.save();

        // Notify user via socket if available
        try {
            const io = req.app.get('io');
            if (io && order.user) {
                io.to(order.user.toString()).emit('orderUpdated', order);
            }
        } catch (e) {
            console.error('Socket emit error:', e.message);
        }

        res.json({ message: 'OTP verified, order marked delivered', order });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update order status (e.g., mark out_for_delivery)
const updateStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;

        if (!status) return res.status(400).json({ message: 'Status is required' });

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (!order.deliveryBoy || order.deliveryBoy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized for this order' });
        }

        // Prevent directly marking as delivered via this endpoint
        if (status === 'delivered') {
            return res.status(400).json({ message: 'Use OTP flow to mark as delivered' });
        }

        order.status = status;
        await order.save();

        res.json(order);
    } catch (error) {
        console.error('Update status error (delivery):', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getAssignedOrders,
    generateOtp,
    verifyOtp,
    updateStatus,
};
