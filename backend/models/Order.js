import mongoose from "mongoose";
import { defaultOptions } from "./options.js";
import { generateDailySequenceNumber } from "./Counter.js";



// Matching quantity sub-schema (for Saree mode)
const matchingQuantitySchema = new mongoose.Schema({
    matchingId: { type: mongoose.Schema.Types.ObjectId, ref: "Matching" },
    matchingName: { type: String },
    quantity: { type: Number, default: 0 },
    dispatchedQuantity: { type: Number, default: 0 } // Track dispatched qty
}, { _id: false });

// Order line item schema
const orderLineItemSchema = new mongoose.Schema({
    qualityId: { type: mongoose.Schema.Types.ObjectId, ref: "Quality" },
    designId: { type: mongoose.Schema.Types.ObjectId, ref: "Design" },
    catalogType: { type: String, required: true, enum: ["Saree", "Taka"] },

    // For Saree mode
    matchingQuantities: [matchingQuantitySchema],
    cut: { type: Number },
    totalSaree: { type: Number },
    totalMeters: { type: Number },

    // For Taka mode
    quantityType: { type: String, enum: ["Taka", "Meter", "Saree"] },
    quantity: { type: Number },
    dispatchedQuantity: { type: Number, default: 0 }, // Track dispatched qty for Taka

    // Common
    rate: { type: Number, required: true },
    orderValue: { type: Number, required: true }
}, { _id: false });

// Main Order schema
const orderSchema = new mongoose.Schema(
    {
        orderNo: { type: String, unique: true },
        date: { type: String, required: true },
        partyId: { type: mongoose.Schema.Types.ObjectId, ref: "Party" },
        factoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Factory" },
        brokerId: { type: mongoose.Schema.Types.ObjectId, ref: "Broker" },
        salesmanId: { type: mongoose.Schema.Types.ObjectId, ref: "Salesman" },
        paymentTerms: { type: String },
        deliveryTerms: { type: String },
        remarks: { type: String },
        status: { type: String, enum: ["pending", "completed"], default: "pending" },
        dispatchStatus: { type: String, enum: ["pending", "partial", "completed"], default: "pending" },
        lineItems: [orderLineItemSchema],
        totalAmount: { type: Number, required: true }
    },
    defaultOptions
);

// Pre-save hook to generate order number
orderSchema.pre("save", async function (next) {
    if (this.isNew && !this.orderNo) {
        this.orderNo = await generateDailySequenceNumber("order");
    }
    next();
});

export const Order = mongoose.model("Order", orderSchema);
