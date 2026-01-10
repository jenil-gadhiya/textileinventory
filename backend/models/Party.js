import mongoose from "mongoose";
import { defaultOptions } from "./options.js";

const partySchema = new mongoose.Schema(
  {
    partyName: { type: String, required: true, unique: true },
    partyCode: { type: String, unique: true, sparse: true },
    brokerName: String,
    phone: String,
    gstNo: String,
    address: String
  },
  defaultOptions
);

export const Party = mongoose.model("Party", partySchema);

