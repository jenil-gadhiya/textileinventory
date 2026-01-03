import mongoose from "mongoose";
import { defaultOptions } from "./options.js";

const catalogSchema = new mongoose.Schema(
  {
    stockType: { type: String, required: true, enum: ["Saree", "Taka"] },
    qualityId: { type: mongoose.Schema.Types.ObjectId, ref: "Quality", required: true },
    designId: { type: mongoose.Schema.Types.ObjectId, ref: "Design", required: true },
    matchingId: { type: mongoose.Schema.Types.ObjectId, ref: "Matching", default: null },
    cut: { type: Number, default: null }
  },
  defaultOptions
);

export const Catalog = mongoose.model("Catalog", catalogSchema);



