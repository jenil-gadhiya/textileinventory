import mongoose from "mongoose";
import { defaultOptions } from "./options.js";

const imageSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
    qualityId: { type: mongoose.Schema.Types.ObjectId, ref: "Quality", required: true },
    designId: { type: mongoose.Schema.Types.ObjectId, ref: "Design", required: true }
  },
  defaultOptions
);

export const ImageModel = mongoose.model("Image", imageSchema);

