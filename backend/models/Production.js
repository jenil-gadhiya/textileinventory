import mongoose from "mongoose";
import { defaultOptions } from "./options.js";

const takaDetailSchema = new mongoose.Schema({
  takaNo: { type: String, required: true },
  meter: { type: Number, required: true }
}, { _id: false });

const matchingQuantitySchema = new mongoose.Schema({
  matchingId: { type: mongoose.Schema.Types.ObjectId, ref: "Matching", required: true },
  matchingName: { type: String, required: true },
  quantity: { type: Number, default: 0 }
}, { _id: false });

const productionSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    factoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Factory", required: true },
    stockType: { type: String, required: true, enum: ["Saree", "Taka"] },

    // Common (used by both Taka and Saree)
    qualityId: { type: mongoose.Schema.Types.ObjectId, ref: "Quality" },

    // For Taka
    takaDetails: [takaDetailSchema],

    // For Saree
    designId: { type: mongoose.Schema.Types.ObjectId, ref: "Design" },
    matchingQuantities: [matchingQuantitySchema],
    cut: { type: Number },
    totalSaree: { type: Number },

    // Common
    totalMeters: { type: Number, required: true }
  },
  defaultOptions
);

export const Production = mongoose.model("Production", productionSchema);
