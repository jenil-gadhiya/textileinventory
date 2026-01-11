import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

// Check if model already exists to avoid recompilation errors if this file is imported multiple times
export const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

/**
 * Generates a simple sequence number (1, 2, 3, ...)
 * @param {string} prefix - The prefix for the counter ID (e.g., "order", "challan")
 * @returns {Promise<string>} - The generated sequence number string
 */
export async function generateDailySequenceNumber(prefix) {
    const counterId = prefix; // Simple counter ID without date

    const counter = await Counter.findByIdAndUpdate(
        { _id: counterId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    return `${counter.seq}`;
}
