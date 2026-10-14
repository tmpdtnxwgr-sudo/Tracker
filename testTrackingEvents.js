import dotenv from "dotenv";
import mongoose from "mongoose";
import Package from "./models/Package.js";
import TrackingEvent from "./models/TrackingEvent.js";

dotenv.config();

const TEST_TRACKING_NUMBER = "TRK-2026-429ADB1D69F1";
const TEST_EVENT_ID = "trackxpress-simulation-test-001";

async function testTrackingEvents() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB.");

        const packageItem = await Package.findOne({
            trackingNumber: TEST_TRACKING_NUMBER
        });

        if (!packageItem) {
            throw new Error("Test package was not found.");
        }

        // Remove only a previous copy of this specific test event.
        await TrackingEvent.deleteOne({
            source: "carrier_api",
            externalEventId: `${packageItem._id}:${TEST_EVENT_ID}`
        });

        const simulatedEvent = {
            package: packageItem._id,
            trackingNumber: packageItem.trackingNumber,
            status: "In Transit",
            location: "Lagos, Nigeria",
            description: "Simulated shipment movement for integration testing.",
            timestamp: new Date("2026-10-13T10:00:00.000Z"),
            updatedBy: null,
            source: "carrier_api",
            externalEventId: `${packageItem._id}:${TEST_EVENT_ID}`,
            isPublic: true
        };

        console.log("\nTest 1: Insert simulated event");

        await TrackingEvent.updateOne(
            {
                source: "carrier_api",
                externalEventId: simulatedEvent.externalEventId
            },
            {
                $setOnInsert: simulatedEvent
            },
            {
                upsert: true
            }
        );

        const firstCount = await TrackingEvent.countDocuments({
            source: "carrier_api",
            externalEventId: simulatedEvent.externalEventId
        });

        console.log("Matching events after first insert:", firstCount);

        console.log("\nTest 2: Insert the same event again");

        await TrackingEvent.updateOne(
            {
                source: "carrier_api",
                externalEventId: simulatedEvent.externalEventId
            },
            {
                $setOnInsert: simulatedEvent
            },
            {
                upsert: true
            }
        );

        const secondCount = await TrackingEvent.countDocuments({
            source: "carrier_api",
            externalEventId: simulatedEvent.externalEventId
        });

        console.log("Matching events after second insert:", secondCount);

        if (firstCount === 1 && secondCount === 1) {
            console.log("\nPASS: Duplicate protection works.");
        } else {
            console.log("\nFAIL: Unexpected event counts.");
        }

        const savedEvent = await TrackingEvent.findOne({
            source: "carrier_api",
            externalEventId: simulatedEvent.externalEventId
        }).lean();

        console.log("\nSaved event:");
        console.log(JSON.stringify({
            status: savedEvent?.status,
            location: savedEvent?.location,
            source: savedEvent?.source,
            externalEventId: savedEvent?.externalEventId
        }, null, 2));

    } catch (error) {
        console.error("Test failed:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

function normalizeStatus(value) {
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

    const normalized = statusMap[status];

    return validStatuses.includes(normalized) ? normalized : null;
}

const testCases = [
    ["created", "Shipment Created"],
    ["picked_up", "Picked Up"],
    ["in_transit", "In Transit"],
    ["arrived", "Arrived at Facility"],
    ["out_for_delivery", "Out for Delivery"],
    ["delivered", "Delivered"],
    ["delivery_attempted", "Delivery Attempted"],
    ["on_hold", "On Hold"],
    ["exception", "Exception"],
    ["cancelled", "Cancelled"],
    ["returned", "Returned"],
    ["unknown_status", null],
    [null, null]
];

let passed = 0;

console.log("\n--- Status Mapping Tests ---");

for (const [input, expected] of testCases) {
    const actual = normalizeStatus(input);
    const success = actual === expected;

    console.log(
        `${success ? "PASS" : "FAIL"}: ${String(input)} -> ${String(actual)}`
    );

    if (success) passed++;
}

console.log(`\nResults: ${passed}/${testCases.length} tests passed.`);