import mongoose from "mongoose";
import { defaultOptions } from "./options.js";

const factorySchema = new mongoose.Schema(
  {
    factoryName: { type: String, required: true },
    gstNo: String,
    factoryNo: { type: String },
    prefix: { type: String },
    address: String,
    contactPerson: String,
    phone: String,
    email: String
  },
  defaultOptions
);

export const Factory = mongoose.model("Factory", factorySchema);

