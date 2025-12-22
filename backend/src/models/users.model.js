import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    token: { type: String },
    // Update the history array structure
    history: [{ 
        meetingCode: { type: String },
        date: { type: Date, default: Date.now },
        startTime: { type: String }, // e.g., "10:30 AM"
        endTime: { type: String }    // e.g., "11:15 AM"
    }]
});

const User = mongoose.model("User", userSchema);
export { User };