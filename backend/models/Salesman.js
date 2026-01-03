import mongoose from "mongoose";
import { defaultOptions } from "./options.js";

const salesmanSchema = new mongoose.Schema(
    {
        salesmanName: { type: String, required: true },
        phoneNumber: { type: String }
    },
    defaultOptions
);

export const Salesman = mongoose.model("Salesman", salesmanSchema);
