import mongoose from "mongoose";
import { defaultOptions } from "./options.js";

const matchingSchema = new mongoose.Schema(
  {
    matchingName: { type: String, required: true, unique: true }
  },
  defaultOptions
);

export const Matching = mongoose.model("Matching", matchingSchema);

