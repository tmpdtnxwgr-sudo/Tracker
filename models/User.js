import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
{
name: {
type: String,
required: true,
trim: true,
minlength: 2,
maxlength: 100
},


    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        maxlength: 254,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },

    password: {
        type: String,
        required: true,
        minlength: 8,
        select: false
    },

    role: {
        type: String,
        enum: ["admin"],
        default: "admin",
        required: true
    },

    isActive: {
        type: Boolean,
        default: true
    },

    lastLogin: {
        type: Date,
        default: null
    }
},
{
    timestamps: true
}


);

// Hash the password before saving a new password or changing an existing one.
userSchema.pre("save", async function () {
if (!this.isModified("password")) {
return;
}


this.password = await bcrypt.hash(this.password, 12);


});

// Compare a login password against the stored hash.
userSchema.methods.comparePassword = async function (candidatePassword) {
return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive information when converting a user document to JSON.
userSchema.set("toJSON", {
transform: (document, returnedObject) => {
delete returnedObject.password;
delete returnedObject.__v;


    return returnedObject;
}


});

const User = mongoose.model("User", userSchema);

export default User;
