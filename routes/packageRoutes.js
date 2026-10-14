import express from "express";

import {
    createPackage,
    getAllPackages,
    getPackageById,
    searchPackageByTrackingNumber,
    updatePackage,
    updatePackageStatus,
    deletePackage,
    getTraceTrackingInfo
} from "../controllers/packageController.js";

import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

/**
 * PUBLIC ROUTE
 * GET /api/packages/track/:trackingNumber
 *
 * Allows customers to track a shipment without logging in.
 */
router.get(
    "/track/:trackingNumber",
    searchPackageByTrackingNumber
);

/**
 * ADMIN ROUTES
 * All routes below require administrator authentication.
 */

// Create a package.
router.post("/", protect, adminOnly, createPackage);

// Retrieve all packages.
router.get("/", protect, adminOnly, getAllPackages);

// Retrieve a package by its database ID.
router.get("/:id", protect, adminOnly, getPackageById);

// Update package details.
router.patch("/:id", protect, adminOnly, updatePackage);

// Update package delivery status and record a tracking event.
router.patch("/:id/status", protect, adminOnly, updatePackageStatus);

// Delete a package.
router.delete("/:id", protect, adminOnly, deletePackage);

router.post("/:id/trace-sync", protect, adminOnly, getTraceTrackingInfo);

export default router;