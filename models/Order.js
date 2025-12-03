
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        orderNumber: {
            type: String,
            unique: true,
        },
        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },
                name: {
                    type: String,
                    required: true,
                },
                price: {
                    type: Number,
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
            },
        ],
        total: {
            type: Number,
            required: true,
            min: 0,
        },
        paymentMethod: {
            type: String,
            enum: ["razorpay", "cod", "paypal"],
            default: "cod",
        },
        isPaid: {
            type: Boolean,
            default: false,
        },
        paidAt: {
            type: Date,
        },
        paymentResult: {
            type: Object,
            default: null,
        },
        status: {
            type: String,
            enum: ["pending", "processing", "out_for_delivery", "delivered", "cancelled"],
            default: "pending",
        },
        // delivery assignment
        deliveryBoy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        deliveryName: {
            type: String,
            required: true,
        },
        deliveryPhone: {
            type: String,
            required: true,
        },
        deliveryAddress: {
            type: String,
            required: true,
        },
        deliveryCity: {
            type: String,
            required: true,
        },
        deliveryZip: {
            type: String,
            required: true,
        },
        deliveryNotes: {
            type: String,
            default: "",
        },
        deliveryLat: {
            type: Number,
            default: null,
        },
        deliveryLng: {
            type: Number,
            default: null,
        },
        estimatedDelivery: {
            type: Date,
            default: function () {
                return new Date(Date.now() + 45 * 60 * 1000);
            },
        },

        // OTP fields for delivery verification
        otpCode: {
            type: String,
            select: false,
        },
        otpExpires: {
            type: Date,
            select: false,
        },
        otpVerified: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Order", orderSchema);
// const mongoose = require("mongoose");

// const orderSchema = new mongoose.Schema(
//     {
//         user: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "User",
//             required: true,
//         },
//         orderNumber: {
//             type: String,
//             unique: true,
//         },
//         items: [
//             {
//                 product: {
//                     type: mongoose.Schema.Types.ObjectId,
//                     ref: "Product",
//                     required: true,
//                 },
//                 name: {
//                     type: String,
//                     required: true,
//                 },
//                 price: {
//                     type: Number,
//                     required: true,
//                 },
//                 quantity: {
//                     type: Number,
//                     required: true,
//                     min: 1,
//                 },
//             },
//         ],
//         total: {
//             type: Number,
//             required: true,
//             min: 0,
//         },
//         status: {
//             type: String,
//             enum: ["pending", "processing", "delivered"],
//             default: "pending",
//         },
//         paymentMethod: {
//             type: String,
//             enum: ["razorpay", "cod"],
//             required: true,
//         },
//         paymentStatus: {
//             type: String,
//             enum: ["pending", "completed", "failed"],
//             default: "pending",
//         },
//         razorpayOrderId: {
//             type: String,
//             default: null,
//         },
//         razorpayPaymentId: {
//             type: String,
//             default: null,
//         },
//         razorpaySignature: {
//             type: String,
//             default: null,
//         },
//         deliveryName: {
//             type: String,
//             required: true,
//         },
//         deliveryPhone: {
//             type: String,
//             required: true,
//         },
//         deliveryAddress: {
//             type: String,
//             required: true,
//         },
//         deliveryCity: {
//             type: String,
//             required: true,
//         },
//         deliveryZip: {
//             type: String,
//             required: true,
//         },
//         deliveryNotes: {
//             type: String,
//             default: "",
//         },
//         deliveryLat: {
//             type: Number,
//             default: null,
//         },
//         deliveryLng: {
//             type: Number,
//             default: null,
//         },
//         estimatedDelivery: {
//             type: Date,
//             default: function () {
//                 return new Date(Date.now() + 45 * 60 * 1000);
//             },
//         },
//     },
//     {
//         timestamps: true,
//     }
// );

// module.exports = mongoose.model("Order", orderSchema);