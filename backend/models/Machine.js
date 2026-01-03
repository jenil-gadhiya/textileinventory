import mongoose from "mongoose";
import { defaultOptions } from "./options.js";

const machineSchema = new mongoose.Schema(
  {
    machineNumber: { type: String, required: true, unique: true },
    machineType: { type: String, required: true },
    shift: { type: String, enum: ["A", "B", "C"], required: true },
    remarks: String
  },
  defaultOptions
);

export const Machine = mongoose.model("Machine", machineSchema);

