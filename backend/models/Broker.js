import mongoose from "mongoose";
import { defaultOptions } from "./options.js";

const brokerSchema = new mongoose.Schema(
    {
        brokerName: { type: String, required: true, unique: true },
        phoneNumber: { type: String }
    },
    defaultOptions
);

export const Broker = mongoose.model("Broker", brokerSchema);
