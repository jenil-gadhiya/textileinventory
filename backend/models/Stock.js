import mongoose from "mongoose";
import { defaultOptions } from "./options.js";

const stockSchema = new mongoose.Schema(
  {
    machineNumber: { type: String, required: true },
    machineType: { type: String, required: true },
    shift: { type: String, enum: ["A", "B", "C"], required: true },
    designNumber: { type: String, required: true },
    designName: { type: String, required: true },
    itemName: { type: String, required: true },
    color: { type: String, required: true },
    hsnCode: { type: String, required: true },
    lotNumber: { type: String, required: true },
    rollNumber: { type: String, required: true },
    quantityMeters: { type: Number, default: 0 },
    quantityWeightKg: { type: Number, default: 0 },
    ratePerMeter: { type: Number, default: 0 },
    ratePerKg: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    quantityType: { type: String, enum: ["Meter", "Kg"], required: true },
    partyName: { type: String, required: true },
    partyCode: { type: String, required: true },
    brokerName: { type: String },
    status: { type: String, enum: ["In", "Out"], required: true },
    entryDate: { type: String, required: true },
    entryTime: { type: String, required: true },
    employeeName: { type: String, required: true },
    remarks: String
  },
  defaultOptions
);

export const Stock = mongoose.model("Stock", stockSchema);

