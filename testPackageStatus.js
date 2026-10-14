import dotenv from "dotenv";
import mongoose from "mongoose";
import Package from "./models/Package.js";
import TrackingEvent from "./models/TrackingEvent.js";

dotenv.config();

const TEST_TRACKING_NUMBER = "TRK-2026-429ADB1D69F1";

async function testPackageStatus() {
    let originalStatus;
    let originalActualDelivery;
    let packageItem;

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB.");

        packageItem = await Package.findOne({
            trackingNumber: TEST_TRACKING_NUMBER
        });

        if (!packageItem) {
            throw new Error("Test package was not found.");
        }

        originalStatus = packageItem.status;
        originalActualDelivery = packageItem.actualDelivery;

        console.log("Original package status:", originalStatus);

        // Test the status update using a simulated event.
        packageItem.status = "Out for Delivery";
        await packageItem.save();

        let updatedPackage = await Package.findById(packageItem._id);

        console.log(
            "Status after simulated update:",
            updatedPackage.status
        );

        if (updatedPackage.status === "Out for Delivery") {
            console.log("PASS: Package status updated correctly.");
        } else {
            console.log("FAIL: Package status did not update.");
        }

        // Test delivery timestamp handling.
        const simulatedDeliveryTime = new Date("2026-10-14T09:00:00.000Z");

        updatedPackage.status = "Delivered";
        updatedPackage.actualDelivery = simulatedDeliveryTime;
        await updatedPackage.save();

        updatedPackage = await Package.findById(packageItem._id);

        console.log("Status after simulated delivery:", updatedPackage.status);
        console.log(
            "Delivery timestamp saved:",
            updatedPackage.actualDelivery?.toISOString()
        );

        if (
            updatedPackage.status === "Delivered" &&
            updatedPackage.actualDelivery?.getTime() ===
                simulatedDeliveryTime.getTime()
        ) {
            console.log("PASS: Delivery status and timestamp saved.");
        } else {
            console.log("FAIL: Delivery status or timestamp is incorrect.");
        }
    } catch (error) {
        console.error("Test failed:", error.message);
        process.exitCode = 1;
    } finally {
        // Restore the original package values, even if a test fails.
        try {
            if (packageItem && originalStatus !== undefined) {
                packageItem.status = originalStatus;
                packageItem.actualDelivery = originalActualDelivery ?? null;
                await packageItem.save();

                console.log(
                    "Restored original package status:",
                    originalStatus
                );
            }
        } catch (restoreError) {
            console.error(
                "WARNING: Could not restore the package:",
                restoreError.message
            );
            process.exitCode = 1;
        }

        await mongoose.disconnect();
    }
}

testPackageStatus();