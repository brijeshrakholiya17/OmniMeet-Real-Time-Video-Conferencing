import { MeetingSession } from "../models/meeting.model.js";
import { Groq } from "groq-sdk";
import httpStatus from "http-status";

const cleanJsonString = (str) => {
    return str.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
};

const generateSummary = async (req, res) => {
    const { id } = req.params;
    
    try {
        const meeting = await MeetingSession.findById(id);
        if (!meeting) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "Meeting session not found" });
        }

        if (!meeting.transcript || meeting.transcript.length === 0) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: "Transcript is empty. Cannot generate summary." });
        }

        // Format transcript into a single readable string
        const formattedTranscript = meeting.transcript
            .map(t => `${t.speaker}: ${t.text}`)
            .join("\n");

        if (!process.env.GROQ_API_KEY) {
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Groq API Key is missing on the server. Please configure GROQ_API_KEY in the env variables." });
        }

        // Initialize Groq SDK
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: 'Here is a meeting transcript. Generate: 1) Executive summary (3-5 bullets), 2) Action items with owners/deadlines, 3) Key decisions. Return strictly as a JSON object: { "summary": [], "actionItems": [], "decisions": [] }.'
                },
                {
                    role: "user",
                    content: formattedTranscript
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const content = chatCompletion.choices[0].message.content;
        const cleanedContent = cleanJsonString(content);
        const data = JSON.parse(cleanedContent);

        // Ensure we always save strings to MongoDB matching the schema definition
        const sanitizeToStringArray = (arr) => {
            if (!Array.isArray(arr)) return [];
            return arr.map(item => {
                if (typeof item === 'object' && item !== null) {
                    const task = item.task || item.item || item.description || item.action || '';
                    const owner = item.owner || item.assignee || '';
                    const deadline = item.deadline || '';
                    
                    if (task && owner) {
                        return `${task} (Owner: ${owner}${deadline ? `, Deadline: ${deadline}` : ''})`;
                    } else if (task) {
                        return task;
                    }
                    return JSON.stringify(item);
                }
                return String(item);
            });
        };

        // Update document
        meeting.aiSummary = sanitizeToStringArray(data.summary);
        meeting.actionItems = sanitizeToStringArray(data.actionItems);
        meeting.decisions = sanitizeToStringArray(data.decisions);
        
        await meeting.save();

        return res.status(httpStatus.OK).json({
            message: "Summary generated successfully",
            meeting
        });

    } catch (e) {
        console.error("Error generating summary:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong: ${e.message || e}` });
    }
};

const getUserMeetingSessions = async (req, res) => {
    try {
        const meetings = await MeetingSession.find({ userId: req.user._id }).sort({ date: -1 });
        return res.status(httpStatus.OK).json(meetings);
    } catch (e) {
        console.error("Error fetching user meeting sessions:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong: ${e.message || e}` });
    }
};

const deleteMeetingSession = async (req, res) => {
    const { id } = req.params;
    
    try {
        const meeting = await MeetingSession.findById(id);
        if (!meeting) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "Meeting session not found" });
        }

        // Validate owner
        if (meeting.userId.toString() !== req.user._id.toString()) {
            return res.status(httpStatus.FORBIDDEN).json({ message: "You are not authorized to delete this meeting session." });
        }

        const meetingCode = meeting.meetingCode;

        // Delete session
        await MeetingSession.findByIdAndDelete(id);

        // Remove from host user's history list
        const user = req.user;
        if (user && Array.isArray(user.history)) {
            user.history = user.history.filter(h => h.meetingCode !== meetingCode);
            await user.save();
        }

        return res.status(httpStatus.OK).json({ message: "Meeting history deleted successfully" });
    } catch (e) {
        console.error("Error deleting meeting session:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Failed to delete meeting session." });
    }
};

export { generateSummary, getUserMeetingSessions, deleteMeetingSession };
