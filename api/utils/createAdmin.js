import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import connectDB from "./connectDB.js";

const createAdmin = async () => {
  try {
    await connectDB();

    const firstName = process.env.ADMIN_FIRST_NAME;
    const lastName = process.env.ADMIN_LAST_NAME;
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!firstName || !lastName || !email || !password) {
      throw new Error(
        "ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_EMAIL and ADMIN_PASSWORD are required."
      );
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      existingUser.role = "admin";
      existingUser.isActive = true;
      existingUser.isEmailVerified = true;

      await existingUser.save();

      console.log(`Existing account promoted to admin: ${email}`);
    } else {
      await User.create({
        firstName,
        lastName,
        email,
        password,
        role: "admin",
        isActive: true,
        isEmailVerified: true,
      });

      console.log(`Administrator created: ${email}`);
    }
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

createAdmin();