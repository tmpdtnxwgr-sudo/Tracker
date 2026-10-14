import Package from "../models/Package.js";
import TrackingEvent from "../models/TrackingEvent.js";

/**
 * Get the complete tracking history for a package.
 * Intended for administrators.
 */
export const getTrackingHistory = async (req, res) => {
    try {
        const { trackingNumber } = req.params;

        const normalizedTrackingNumber = String(trackingNumber || "")
            .trim()
            .toUpperCase();

        if (!normalizedTrackingNumber) {
            return res.status(400).json({
                success: false,
                message: "A tracking number is required."
            });
        }

        const packageItem = await Package.findOne({
            trackingNumber: normalizedTrackingNumber
        }).select("_id trackingNumber status");

        if (!packageItem) {
            return res.status(404).json({
                success: false,
                message: "Package not found."
            });
        }

        const events = await TrackingEvent.find({
            package: packageItem._id
        })
            .populate("updatedBy", "name email")
            .sort({ timestamp: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: {
                package: packageItem,
                events
            }
        });
    } catch (error) {
        console.error("Get tracking history error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve tracking history."
        });
    }
};


/**
 * Add a tracking event to a package.
 * Intended for administrators.
 */
export const addTrackingEvent = async (req, res) => {
    try {
        const { trackingNumber } = req.params;
        const { status, location, description, timestamp, isPublic } = req.body;

        const normalizedTrackingNumber = String(trackingNumber || "")
            .trim()
            .toUpperCase();

        if (!normalizedTrackingNumber) {
            return res.status(400).json({
                success: false,
                message: "A tracking number is required."
            });
        }

        if (
            typeof status !== "string" ||
            typeof location !== "string" ||
            typeof description !== "string" ||
            !location.trim() ||
            !description.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Status, location, and description are required."
            });
        }

        const allowedStatuses = [
            "Pending",
            "Shipment Created",
            "Picked Up",
            "In Transit",
            "Arrived at Facility",
            "Out for Delivery",
            "Delivered",
            "Delivery Attempted",
            "On Hold",
            "Exception",
            "Cancelled",
            "Returned"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "The supplied package status is invalid."
            });
        }

        const packageItem = await Package.findOne({
            trackingNumber: normalizedTrackingNumber
        });

        if (!packageItem) {
            return res.status(404).json({
                success: false,
                message: "Package not found."
            });
        }

        let eventTimestamp = new Date();

        if (timestamp !== undefined) {
            eventTimestamp = new Date(timestamp);

            if (Number.isNaN(eventTimestamp.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "The supplied timestamp is invalid."
                });
            }

            if (eventTimestamp > new Date()) {
                return res.status(400).json({
                    success: false,
                    message: "The event timestamp cannot be in the future."
                });
            }
        }

        const event = await TrackingEvent.create({
            package: packageItem._id,
            trackingNumber: packageItem.trackingNumber,
            status,
            location: location.trim(),
            description: description.trim(),
            timestamp: eventTimestamp,
            updatedBy: req.user?._id || null,
            source: "admin",
            isPublic: typeof isPublic === "boolean" ? isPublic : true
        });

        return res.status(201).json({
            success: true,
            message: "Tracking event added successfully.",
            data: {
                event
            }
        });
    } catch (error) {
        console.error("Add tracking event error:", error.message);

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Invalid tracking event information.",
                errors: Object.values(error.errors).map(
                    (item) => item.message
                )
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to add tracking event."
        });
    }
};


/**
 * Delete a tracking event.
 * Intended for administrators correcting an erroneous event.
 */
export const deleteTrackingEvent = async (req, res) => {
    try {
        const { eventId } = req.params;

        if (!/^[a-f\d]{24}$/i.test(eventId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid tracking event ID."
            });
        }

        const deletedEvent = await TrackingEvent.findByIdAndDelete(eventId);

        if (!deletedEvent) {
            return res.status(404).json({
                success: false,
                message: "Tracking event not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Tracking event deleted successfully."
        });
    } catch (error) {
        console.error("Delete tracking event error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to delete tracking event."
        });
    }
};