import express from "express";

import {
    loginAdmin,
    getAdminProfile,
    logoutAdmin
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

/**
 * POST /api/auth/login
 * Log in an administrator.
 * Public endpoint.
 */
router.post("/login", loginAdmin);

/**
 * GET /api/auth/profile
 * Retrieve the logged-in administrator's profile.
 */
router.get("/profile", protect, adminOnly, getAdminProfile);

/**
 * POST /api/auth/logout
 * Log out an administrator.
 */
router.post("/logout", protect, adminOnly, logoutAdmin);

export default router;