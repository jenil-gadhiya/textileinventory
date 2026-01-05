import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

// Check if model already exists to avoid recompilation errors if this file is imported multiple times
export const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

/**
 * Generates a daily sequence number in format YYYYMMDD + Sequence
 * @param {string} prefix - The prefix for the counter ID (e.g., "order", "challan")
 * @returns {Promise<string>} - The generated sequence number string
 */
export async function generateDailySequenceNumber(prefix) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;

    const counterId = `${prefix}_${dateStr}`;

    const counter = await Counter.findByIdAndUpdate(
        { _id: counterId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    return `${dateStr}${counter.seq}`;
}
