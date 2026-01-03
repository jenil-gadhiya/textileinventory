import mongoose from "mongoose";
import { defaultOptions } from "./options.js";

const inventorySchema = new mongoose.Schema(
    {
        // Identification fields
        qualityId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quality",
            required: true,
        },
        designId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Design",
        },
        factoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Factory",
        },
        matchingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Matching",
        },

        // Stock type
        type: {
            type: String,
            enum: ["Taka", "Saree"],
            required: true,
        },

        // For Taka stock tracking
        totalMetersProduced: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalMetersOrdered: {
            type: Number,
            default: 0,
            min: 0,
        },
        // For Taka Piece tracking
        totalTakaProduced: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalTakaOrdered: {
            type: Number,
            default: 0,
            min: 0,
        },

        // For Saree stock tracking
        totalSareeProduced: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalSareeOrdered: {
            type: Number,
            default: 0,
            min: 0,
        },
        cut: {
            type: Number, // Cut length for saree (in meters)
        },
    },
    defaultOptions
);

// Virtual fields for available stock
inventorySchema.virtual("availableMeters").get(function () {
    return this.totalMetersProduced - this.totalMetersOrdered;
});

inventorySchema.virtual("availableTaka").get(function () {
    return this.totalTakaProduced - this.totalTakaOrdered;
});

inventorySchema.virtual("availableSaree").get(function () {
    return this.totalSareeProduced - this.totalSareeOrdered;
});

// Ensure virtuals are included in JSON responses
inventorySchema.set("toJSON", {
    virtuals: true,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

inventorySchema.set("toObject", { virtuals: true });

// Compound index for efficient queries
inventorySchema.index({
    qualityId: 1,
    designId: 1,
    factoryId: 1,
    matchingId: 1,
    type: 1,
});

// Index for type-specific queries
inventorySchema.index({ type: 1 });

export const Inventory = mongoose.model("Inventory", inventorySchema);
