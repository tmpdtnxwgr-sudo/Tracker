import User from "../models/User.js";
import jwt from "jsonwebtoken";

/**
 * Generate a JWT for an authenticated administrator.
 */
const generateToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured.");
    }

    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
};


/**
 * Log in an administrator.
 */
export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail,
            role: "admin",
            isActive: true
        }).select("+password");

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user._id);

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error("Admin login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to log in at this time."
        });
    }
};


/**
 * Retrieve the currently authenticated administrator's profile.
 * Requires authentication middleware to populate req.user.
 */
export const getAdminProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                user: {
                    id: req.user._id,
                    name: req.user.name,
                    email: req.user.email,
                    role: req.user.role,
                    lastLogin: req.user.lastLogin
                }
            }
        });
    } catch (error) {
        console.error("Get admin profile error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve administrator profile."
        });
    }
};


/**
 * Log out an administrator.
 *
 * JWT logout is normally handled by the frontend deleting its token.
 * This endpoint provides a consistent API response.
 */
export const logoutAdmin = async (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Logout successful. Please remove the authentication token."
    });
};