import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Verify the JWT and authenticate the administrator.
 */
export const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Check whether an authorization token was provided.
        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                success: false,
                message: "Authentication required. Please log in."
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is missing."
            });
        }

        // Verify the token using the secret stored in .env.
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured.");

            return res.status(500).json({
                success: false,
                message: "Server authentication is not configured."
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Find the active administrator associated with the token.
        const user = await User.findOne({
            _id: decoded.id,
            role: "admin",
            isActive: true
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Your account is unavailable. Please log in again."
            });
        }

        // Make the authenticated user available to controllers.
        req.user = user;

        next();
    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Your authentication token is invalid or expired."
            });
        }

        console.error("Authentication error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Authentication failed due to a server error."
        });
    }
};