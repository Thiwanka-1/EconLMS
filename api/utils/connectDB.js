import mongoose from "mongoose";
import dns from "node:dns/promises";

// Fix DNS resolution issues for certain MongoDB/Ollama environments
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI or MONGO_URI is missing from the environment variables.");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 15_000,
  });

  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

export default connectDB;