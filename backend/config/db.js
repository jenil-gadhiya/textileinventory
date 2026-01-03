import mongoose from "mongoose";

const uri = process.env.MONGO_URI;
let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    return;
  }

  if (!uri) {
    throw new Error("MONGO_URI not provided");
  }

  try {
    const db = await mongoose.connect(uri, {
      dbName: process.env.MONGO_DB || "textile_os"
    });
    isConnected = db.connections[0].readyState;
    console.log("MongoDB connected");
  } catch (error) {
    console.log(error);
  }
};



