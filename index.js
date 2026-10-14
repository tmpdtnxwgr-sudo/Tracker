import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import packageRoutes from "./routes/packageRoutes.js";
import trackingRoutes from "./routes/trackingRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
cors({
origin: [
"http://localhost:5173",
"https://tracker-frontend-pied.vercel.app"
]
})
);

app.use(express.json({ limit: "1mb" }));

// Basic routes
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Tracking API is running successfully."
    });
});

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is healthy."
    });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/tracking", trackingRoutes);

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "The requested API endpoint does not exist."
    });
});

// Handle unexpected errors
app.use((err, req, res, next) => {
    console.error("Server error:", err.message);

    if (res.headersSent) {
        return next(err);
    }

    res.status(err.status || 500).json({
        success: false,
        message:
            err.status && err.status < 500
                ? err.message
                : "An unexpected server error occurred."
    });
});

// Connect to MongoDB before accepting requests.
const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Tracking server running on port ${PORT}`);
            console.log(`API URL: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();