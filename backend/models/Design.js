import mongoose from "mongoose";
import { defaultOptions } from "./options.js";

const designSchema = new mongoose.Schema(
  {
    designNumber: { type: String, required: true, unique: true },
    designName: String,
    itemName: String,
    hsnCode: String,
    color: String,
    gsm: String,
    lotNumber: String
  },
  defaultOptions
);

export const Design = mongoose.model("Design", designSchema);

