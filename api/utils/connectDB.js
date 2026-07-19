import mongoose from "mongoose";
import dns from "node:dns/promises";

// Fix DNS resolution issues for certain MongoDB/Ollama environments
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing from the environment variables.");
  }

  await mongoose.connect(mongoUri);

  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

export default connectDB;