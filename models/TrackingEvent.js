import mongoose from "mongoose";

const trackingEventSchema = new mongoose.Schema(
{
package: {
type: mongoose.Schema.Types.ObjectId,
ref: "Package",
required: true,
index: true
},


    trackingNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        index: true
    },

    status: {
        type: String,
        required: true,
        enum: [
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
        ]
    },

    location: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },

    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },

    timestamp: {
        type: Date,
        required: true,
        default: Date.now
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    source: {
        type: String,
        enum: ["admin", "carrier_api", "system"],
        default: "admin",
        required: true
    },

    externalEventId: {
        type: String,
        trim: true,
        default: ""
    },

    isPublic: {
        type: Boolean,
        default: true
    }
},
{
    timestamps: true
}


);

// Retrieve a package's events in chronological order.
trackingEventSchema.index({
package: 1,
timestamp: 1
});

// Prevent duplicate carrier events when the provider supplies an event ID.
trackingEventSchema.index(
{ source: 1, externalEventId: 1 },
{
unique: true,
partialFilterExpression: {
externalEventId: { $gt: "" },
source: "carrier_api"
}
}
);

const TrackingEvent = mongoose.model(
"TrackingEvent",
trackingEventSchema
);

export default TrackingEvent;
