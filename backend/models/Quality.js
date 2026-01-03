import mongoose from "mongoose";
import { defaultOptions } from "./options.js";

const qualitySchema = new mongoose.Schema(
  {
    fabricName: { type: String, required: true },
    loomType: { type: String, required: true },
    fabricType: { type: String, required: true }
  },
  defaultOptions
);

export const Quality = mongoose.model("Quality", qualitySchema);

