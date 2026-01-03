import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI not provided");
  }
  await mongoose.connect(uri, {
    dbName: process.env.MONGO_DB || "textile_os"
  });
  console.log("MongoDB connected");
};



