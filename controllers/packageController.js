import Package from "../models/Package.js";
import TrackingEvent from "../models/TrackingEvent.js";
import { trackWithTrace } from "../services/traceApiService.js";
import { generateTrackingNumber } from "../utils/generateTrackingNumber.js";


/**
 * Create a new package.
 * The tracking number is generated automatically.
 * An initial tracking event is also recorded.
 */
export const createPackage = async (req, res) => {
    try {
        const trackingNumber = generateTrackingNumber();

        const packageData = {
            ...req.body,
            trackingNumber,
            createdBy: req.user?._id || null
        };

        const newPackage = await Package.create(packageData);

        try {
            await TrackingEvent.create({
                package: newPackage._id,
                trackingNumber: newPackage.trackingNumber,
                status: newPackage.status,
                location: `${newPackage.origin.city}, ${newPackage.origin.country}`,
                description: "Shipment created and registered in the tracking system.",
                updatedBy: req.user?._id || null,
                source: "admin",
                isPublic: true
            });
        } catch (eventError) {
            // Avoid leaving a package without its initial tracking event.
            await Package.findByIdAndDelete(newPackage._id);
            throw eventError;
        }

        return res.status(201).json({
            success: true,
            message: "Package created successfully.",
            data: {
                package: newPackage
            }
        });
    } catch (error) {
        console.error("Create package error:", error.message);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A duplicate tracking number was detected. Please try again."
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Invalid package information.",
                errors: Object.values(error.errors).map(
                    (item) => item.message
                )
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to create package."
        });
    }
};


/**
 * Retrieve all packages.
 * Supports pagination and filtering by status.
 */
export const getAllPackages = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
            100,
            Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
        );

        const filter = {};

        if (req.query.status) {
            filter.status = req.query.status;
        }

        const [packages, total] = await Promise.all([
            Package.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),

            Package.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            data: {
                packages,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error("Get packages error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve packages."
        });
    }
};


/**
 * Retrieve one package and its tracking history using its database ID.
 */
export const getPackageById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^[a-f\d]{24}$/i.test(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid package ID."
            });
        }

        const packageItem = await Package.findById(id).lean();

        if (!packageItem) {
            return res.status(404).json({
                success: false,
                message: "Package not found."
            });
        }

        const trackingEvents = await TrackingEvent.find({
            package: packageItem._id
        })
            .sort({ timestamp: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: {
                package: packageItem,
                trackingEvents
            }
        });
    } catch (error) {
        console.error("Get package error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve package."
        });
    }
};


/**
 * Search for a TrackXpress shipment or track an external shipment.
 */
export const searchPackageByTrackingNumber = async (req, res) => {
    try {
        const trackingNumber = String(
            req.params.trackingNumber || ""
        ).trim().toUpperCase();

        const carrier = req.query.carrier
    ? String(req.query.carrier).trim().toLowerCase()
    : null;

        if (!trackingNumber) {
            return res.status(400).json({
                success: false,
                message: "Please provide a tracking number."
            });
        }

        // 1. Search TrackXpress database first.
        const packageItem = await Package.findOne({
            trackingNumber
        })
            .select(
                "trackingNumber status origin.city origin.state origin.country destination.city destination.state destination.country carrier estimatedDelivery actualDelivery createdAt"
            )
            .lean();

        // 2. If found, return existing TrackXpress tracking data.
        if (packageItem) {
            const trackingEvents = await TrackingEvent.find({
                package: packageItem._id,
                isPublic: true
            })
                .select("status location description timestamp")
                .sort({ timestamp: 1 })
                .lean();

            return res.status(200).json({
                success: true,
                source: "trackxpress",
                data: {
                    package: packageItem,
                    trackingEvents
                }
            });
        }

        // 3. If not found, try Trace API.
        try {
            const traceResult = await trackWithTrace(
    trackingNumber,
    carrier
);

            return res.status(200).json({
                success: true,
                source: "trace",
                data: {
                    tracking: traceResult
                }
            });
        } catch (traceError) {
            console.error(
                "Trace API tracking error:",
                traceError.message
            );

            // 4. Handle errors without exposing internal details.
            if (traceError.status === 401 || traceError.status === 403) {
                return res.status(502).json({
                    success: false,
                    message: "The external tracking service could not authorize the request."
                });
            }

            if (traceError.status === 404) {
                return res.status(404).json({
                    success: false,
                    message: "No tracking information was found for this tracking number."
                });
            }

            return res.status(502).json({
                success: false,
                message: "We could not retrieve tracking information from the external tracking service. Please try again later."
            });
        }
    } catch (error) {
        console.error("Track package error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to track package at this time."
        });
    }
};


/**
 * Update package details.
 * Tracking numbers cannot be changed.
 * Status changes must go through updatePackageStatus so that
 * a tracking event is recorded.
 */
export const updatePackage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^[a-f\d]{24}$/i.test(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid package ID."
            });
        }

        const allowedFields = [
            "sender",
            "recipient",
            "packageDescription",
            "weight",
            "weightUnit",
            "dimensions",
            "origin",
            "destination",
            "estimatedDelivery",
            "shippingCost",
            "currency",
            "carrier",
            "externalTrackingNumber"
        ];

        const updateData = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid package fields were provided for updating."
            });
        }

        const updatedPackage = await Package.findByIdAndUpdate(
            id,
            { $set: updateData },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedPackage) {
            return res.status(404).json({
                success: false,
                message: "Package not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Package updated successfully.",
            data: {
                package: updatedPackage
            }
        });
    } catch (error) {
        console.error("Update package error:", error.message);

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Invalid package information.",
                errors: Object.values(error.errors).map(
                    (item) => item.message
                )
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to update package."
        });
    }
};


/**
 * Update a package's delivery status and record a tracking event.
 */
export const updatePackageStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, location, description } = req.body;

        if (!/^[a-f\d]{24}$/i.test(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid package ID."
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

        const packageItem = await Package.findById(id);

        if (!packageItem) {
            return res.status(404).json({
                success: false,
                message: "Package not found."
            });
        }

        const previousStatus = packageItem.status;
        packageItem.status = status;

        if (status === "Delivered") {
            packageItem.actualDelivery = new Date();
        }

        if (status !== "Delivered") {
            packageItem.actualDelivery = null;
        }

        await packageItem.save();

        try {
            await TrackingEvent.create({
                package: packageItem._id,
                trackingNumber: packageItem.trackingNumber,
                status,
                location: location.trim(),
                description: description.trim(),
                updatedBy: req.user?._id || null,
                source: "admin",
                isPublic: true
            });
        } catch (eventError) {
            // Restore the previous package status if event creation fails.
            packageItem.status = previousStatus;

            if (previousStatus !== "Delivered") {
                packageItem.actualDelivery = null;
            }

            await packageItem.save();
            throw eventError;
        }

        return res.status(200).json({
            success: true,
            message: "Package status updated successfully.",
            data: {
                package: packageItem
            }
        });
    } catch (error) {
        console.error("Update package status error:", error.message);

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Invalid package status information."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to update package status."
        });
    }
};


/**
 * Delete a package and its tracking events.
 */
export const deletePackage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^[a-f\d]{24}$/i.test(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid package ID."
            });
        }

        const deletedPackage = await Package.findByIdAndDelete(id);

        if (!deletedPackage) {
            return res.status(404).json({
                success: false,
                message: "Package not found."
            });
        }

        await TrackingEvent.deleteMany({
            package: deletedPackage._id
        });

        return res.status(200).json({
            success: true,
            message: "Package and its tracking history deleted successfully."
        });
    } catch (error) {
        console.error("Delete package error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to delete package."
        });
    }
};

/**
 * Retrieve live tracking information from Trace API.
 * This function does not modify the package or its tracking history yet.
 */
export const getTraceTrackingInfo = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^[a-f\d]{24}$/i.test(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid package ID."
            });
        }

        const packageItem = await Package.findById(id);

        if (!packageItem) {
            return res.status(404).json({
                success: false,
                message: "Package not found."
            });
        }

        if (!packageItem.externalTrackingNumber) {
            return res.status(400).json({
                success: false,
                message:
                    "This package does not have an external carrier tracking number."
            });
        }

        // Fetch the latest information from the carrier.
        const trackingInfo = await trackWithTrace(
            packageItem.externalTrackingNumber,
            packageItem.carrier || null
        );

        if (!Array.isArray(trackingInfo.events)) {
            return res.status(502).json({
                success: false,
                message: "The carrier returned an invalid tracking response."
            });
        }

        const validStatuses = [
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

        const normalizeStatus = (value) => {
            if (typeof value !== "string") return null;

            const status = value.trim().toLowerCase();

            const statusMap = {
                pending: "Pending",
                created: "Shipment Created",
                "shipment created": "Shipment Created",
                "label created": "Shipment Created",
                picked_up: "Picked Up",
                "picked up": "Picked Up",
                transit: "In Transit",
                in_transit: "In Transit",
                "in transit": "In Transit",
                arrived: "Arrived at Facility",
                "arrived at facility": "Arrived at Facility",
                out_for_delivery: "Out for Delivery",
                "out for delivery": "Out for Delivery",
                delivered: "Delivered",
                delivery_attempted: "Delivery Attempted",
                "delivery attempted": "Delivery Attempted",
                on_hold: "On Hold",
                "on hold": "On Hold",
                exception: "Exception",
                cancelled: "Cancelled",
                canceled: "Cancelled",
                returned: "Returned"
            };

            const normalized = statusMap[status];

            return validStatuses.includes(normalized)
                ? normalized
                : null;
        };

        let savedEvents = 0;

        for (const event of trackingInfo.events) {
            // Field names are provisional until we verify a real API response.
            const status = normalizeStatus(
                event.status || event.tag || event.sub_status
            );

            const description =
                event.description ||
                event.message ||
                event.status_description ||
                event.status ||
                event.tag;

            const rawTimestamp =
                event.timestamp ||
                event.datetime ||
                event.event_time ||
                event.time;

            const timestamp = rawTimestamp
                ? new Date(rawTimestamp)
                : null;

            const locationValue = event.location;

            const location =
                typeof locationValue === "string"
                    ? locationValue
                    : locationValue && typeof locationValue === "object"
                        ? [
                            locationValue.name,
                            locationValue.city,
                            locationValue.state,
                            locationValue.country
                        ].filter(Boolean).join(", ")
                        : "";

            // Skip events that cannot be safely mapped to the database schema.
            if (
                !status ||
                typeof description !== "string" ||
                !description.trim() ||
                !timestamp ||
                Number.isNaN(timestamp.getTime()) ||
                !location.trim()
            ) {
                continue;
            }

            // Use the provider's event ID when available.
            // Otherwise, generate a deterministic fingerprint.
            const providerEventId =
                event.id ||
                event.event_id ||
                event.tracking_event_id;

            const fingerprintSource = [
                packageItem._id.toString(),
                timestamp.toISOString(),
                status,
                location.trim(),
                description.trim()
            ].join("|");

            const externalEventId = providerEventId
                ? `${packageItem._id}:${providerEventId}`
                : `${packageItem._id}:${Buffer
                    .from(fingerprintSource)
                    .toString("base64url")}`;

            const result = await TrackingEvent.updateOne(
                {
                    source: "carrier_api",
                    externalEventId
                },
                {
                    $setOnInsert: {
                        package: packageItem._id,
                        trackingNumber: packageItem.trackingNumber,
                        status,
                        location: location.trim().slice(0, 200),
                        description: description.trim().slice(0, 1000),
                        timestamp,
                        updatedBy: null,
                        source: "carrier_api",
                        externalEventId,
                        isPublic: true
                    }
                },
                { upsert: true }
            );

            if (result.upsertedCount > 0) {
                savedEvents++;
            }
        }

        // Reload the events so the response reflects the database.
        const events = await TrackingEvent.find({
            package: packageItem._id
        }).sort({ timestamp: 1 });

        // Use the newest saved event to determine the current status.
        const latestEvent = events.at(-1);

        if (latestEvent) {
            packageItem.status = latestEvent.status;

            if (
                latestEvent.status === "Delivered" &&
                !packageItem.actualDelivery
            ) {
                packageItem.actualDelivery = latestEvent.timestamp;
            }

            await packageItem.save();
        }

        return res.status(200).json({
            success: true,
            message: "Carrier tracking information synchronized.",
            data: {
                package: packageItem,
                trackingInfo,
                events,
                newEventsSaved: savedEvents
            }
        });
    } catch (error) {
        console.error("Trace tracking sync error:", error);

        if (error.code === 11000) {
            return res.status(200).json({
                success: true,
                message:
                    "Tracking information was retrieved, but a duplicate event was encountered. Please synchronize again.",
                data: {
                    newEventsSaved: 0
                }
            });
        }

        return res.status(error.status === 429 ? 429 : 502).json({
            success: false,
            message: "Unable to synchronize carrier tracking information."
        });
    }
};
