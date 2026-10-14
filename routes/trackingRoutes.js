import express from "express";

import {
    getTrackingHistory,
    addTrackingEvent,
    deleteTrackingEvent
} from "../controllers/trackingController.js";

import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

/**
 * All tracking-management routes require administrator authentication.
 */

// Retrieve tracking history for a package.
router.get(
    "/:trackingNumber",
    protect,
    adminOnly,
    getTrackingHistory
);

// Add a tracking event to a package.
router.post(
    "/:trackingNumber/events",
    protect,
    adminOnly,
    addTrackingEvent
);

// Delete a tracking event by its database ID.
router.delete(
    "/events/:eventId",
    protect,
    adminOnly,
    deleteTrackingEvent
);

export default router;