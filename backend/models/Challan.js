import mongoose from "mongoose";
import { defaultOptions } from "./options.js";
import { generateDailySequenceNumber } from "./Counter.js";

const challanSchema = new mongoose.Schema(
    {
        // Challan identification
        challanNo: {
            type: String,
            unique: true,
        },
        challanDate: {
            type: Date,
            required: true,
            default: Date.now,
        },

        // Reference to order
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
        },

        // Party/Customer info
        partyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Party",
            required: true,
        },

        // Challan items (from order line items)
        items: [
            {
                // Reference to original order line item index
                orderLineItemIndex: { type: Number },

                qualityId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Quality",
                },
                designId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Design",
                },

                // Type
                type: {
                    type: String,
                    enum: ["Taka", "Saree"],
                },
                quantityType: { type: String }, // "Taka", "Meter", "Saree"

                // For Taka
                orderedQuantity: { type: Number }, // Original order qty (meters)
                challanQuantity: { type: Number }, // Dispatched qty in this challan (meters)

                // Selected pieces for Taka (for PDF display)
                selectedPieces: [
                    {
                        takaNo: { type: String },
                        meter: { type: Number },
                        stockPieceId: { type: mongoose.Schema.Types.ObjectId, ref: "StockPiece" }
                    }
                ],

                // For Saree
                matchingQuantities: [
                    {
                        matchingId: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: "Matching",
                        },
                        orderedQuantity: { type: Number }, // Original order qty
                        challanQuantity: { type: Number }, // Dispatched qty in this challan
                    },
                ],
                cut: { type: Number },
                // Optional Batch/Potla Number
                batchNo: { type: String },
            },
        ],

        // Status
        status: {
            type: String,
            enum: ["pending", "dispatched", "delivered"],
            default: "dispatched",
        },

        // Additional info
        // transportDetails, vehicleNumber removed
        remarks: { type: String },
    },
    defaultOptions
);

// Auto-generate challan number before saving
challanSchema.pre("save", async function (next) {
    if (this.isNew && !this.challanNo) {
        this.challanNo = await generateDailySequenceNumber("challan");
    }
    next();
});

export const Challan = mongoose.model("Challan", challanSchema);
