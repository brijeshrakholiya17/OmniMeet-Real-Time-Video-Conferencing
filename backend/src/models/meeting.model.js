import mongoose, { Schema } from "mongoose";

const meetingSessionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    meetingCode: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    date: { type: Date, default: Date.now, required: true }
});

const MeetingSession = mongoose.model("MeetingSession", meetingSessionSchema);

export { MeetingSession };