import mongoose from "mongoose";
import { defaultOptions } from "./options.js";

const stockPieceSchema = new mongoose.Schema(
    {
        takaNo: { type: String, required: true },
        meter: { type: Number, required: true },
        status: {
            type: String,
            enum: ["Available", "Ordered", "Sold"], // Ordered = In Challan but not dispatched? OR just "Reserved"? User said "Challan".
            // Let's use: "Available", "InChallan", "Sold"
            // Actually, Challan = Dispatch?
            // "InChallan" means added to a Challan but maybe Challan not final?
            // User says: "edit order at challan creation time".
            // Let's stick to simple: "Available", "Sold".
            // If in Challan, it's effectively "Sold" or "Reserved".
            // Let's use "Available" and "Sold" for now. "InChallan" might be useful if we have draft challans.
            default: "Available",
        },
        qualityId: { type: mongoose.Schema.Types.ObjectId, ref: "Quality", required: true },
        designId: { type: mongoose.Schema.Types.ObjectId, ref: "Design" },
        factoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Factory", required: true },
        productionId: { type: mongoose.Schema.Types.ObjectId, ref: "Production", required: true },

        // Link to Challan where this piece was used
        challanId: { type: mongoose.Schema.Types.ObjectId, ref: "Challan" },

        // Link to Order is implicit via Challan -> OrderItem? Or direct?
        // Challan is linked to Order.
    },
    defaultOptions
);

// Indexes for fast lookup
stockPieceSchema.index({ status: 1 });
stockPieceSchema.index({ qualityId: 1, designId: 1, status: 1 });
stockPieceSchema.index({ factoryId: 1 });

export const StockPiece = mongoose.model("StockPiece", stockPieceSchema);
