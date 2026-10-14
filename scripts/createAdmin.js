import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

const createAdmin = async () => {
    try {
        const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

        // Ensure the required administrator details are provided.
        if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
            throw new Error(
                "ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set in .env."
            );
        }

        if (ADMIN_PASSWORD.length < 8) {
            throw new Error(
                "ADMIN_PASSWORD must contain at least 12 characters."
            );
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL)) {
            throw new Error("ADMIN_EMAIL must be a valid email address.");
        }

        // Connect to MongoDB.
        await connectDB();

        // Prevent this script from creating additional admin accounts.
        const existingAdmin = await User.findOne({ role: "admin" });

        if (existingAdmin) {
            console.log(
                "An administrator already exists. No new account was created."
            );
            return;
        }

        // Create the initial administrator.
        // The User model hashes the password automatically.
        const admin = await User.create({
            name: ADMIN_NAME.trim(),
            email: ADMIN_EMAIL.trim().toLowerCase(),
            password: ADMIN_PASSWORD,
            role: "admin"
        });

        console.log("Initial administrator created successfully.");
        console.log(`Admin email: ${admin.email}`);
        console.log("You can now log in through the admin login endpoint.");
    } catch (error) {
        console.error("Administrator setup failed:", error.message);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
    }
};

createAdmin();