import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    token: { type: String, index: true },
    history: [{
        meetingCode: { type: String },
        date: { type: Date, default: Date.now },
        startTime: { type: String },
        endTime: { type: String }
    }]
});

const User = mongoose.model("User", userSchema);
export { User };