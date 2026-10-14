import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
{
street: {
type: String,
trim: true,
default: ""
},
city: {
type: String,
required: true,
trim: true
},
state: {
type: String,
trim: true,
default: ""
},
postalCode: {
type: String,
trim: true,
default: ""
},
country: {
type: String,
required: true,
trim: true
}
},
{ _id: false }
);

const contactSchema = new mongoose.Schema(
{
name: {
type: String,
required: true,
trim: true
},
email: {
type: String,
trim: true,
lowercase: true,
default: ""
},
phone: {
type: String,
required: true,
trim: true
},
address: {
type: addressSchema,
required: true
}
},
{ _id: false }
);

const packageSchema = new mongoose.Schema(
{
trackingNumber: {
type: String,
required: true,
unique: true,
immutable: true,
trim: true,
uppercase: true,
index: true
},

    sender: {
        type: contactSchema,
        required: true
    },

    recipient: {
        type: contactSchema,
        required: true
    },

    packageDescription: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },

    weight: {
        type: Number,
        required: true,
        min: 0.01
    },

    weightUnit: {
        type: String,
        enum: ["kg", "g", "lb"],
        default: "kg"
    },

    dimensions: {
        length: {
            type: Number,
            min: 0
        },
        width: {
            type: Number,
            min: 0
        },
        height: {
            type: Number,
            min: 0
        },
        unit: {
            type: String,
            enum: ["cm", "in"],
            default: "cm"
        }
    },

    status: {
        type: String,
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
        ],
        default: "Pending",
        required: true
    },

    origin: {
        type: addressSchema,
        required: true
    },

    destination: {
        type: addressSchema,
        required: true
    },

    estimatedDelivery: {
        type: Date,
        default: null
    },

    actualDelivery: {
        type: Date,
        default: null
    },

    shippingCost: {
        type: Number,
        min: 0,
        default: 0
    },

    currency: {
        type: String,
        uppercase: true,
        trim: true,
        default: "NGN"
    },

    carrier: {
        type: String,
        trim: true,
        default: ""
    },

    externalTrackingNumber: {
        type: String,
        trim: true,
        default: ""
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    }
},
{
    timestamps: true
}


);

const Package = mongoose.model("Package", packageSchema);

export default Package;
