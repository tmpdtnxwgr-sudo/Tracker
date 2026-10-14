import mongoose from "mongoose";

/**
 * Connect to MongoDB using the connection string in .env.
 */
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            throw new Error(
                "MONGODB_URI is missing from your environment variables."
            );
        }

        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 10000
        });

        console.log(
            `MongoDB connected successfully: ${mongoose.connection.host}`
        );
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);

        // Stop the application if the database cannot connect.
        process.exit(1);
    }
};

export default connectDB;