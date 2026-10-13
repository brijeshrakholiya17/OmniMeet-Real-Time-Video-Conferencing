import { MeetingSession } from "../models/meeting.model.js";
import { Groq } from "groq-sdk";
import httpStatus from "http-status";

const GROQ_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b"
];

const extractAndParseJson = (content) => {
    if (!content || typeof content !== "string") {
        throw new Error("Empty response received from AI model.");
    }

    // 1. Direct attempt after stripping code fences and leading/trailing whitespace
    const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        // Fallback to substring extraction
    }

    // 2. Extract substring between the first '{' and the last '}'
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const potentialJson = content.substring(firstBrace, lastBrace + 1);
        try {
            return JSON.parse(potentialJson);
        } catch {
            // Keep throwing standard error below
        }
    }

    throw new Error("Could not parse AI response as valid JSON.");
};

// Ensure we always save strings to MongoDB matching the schema definition
const sanitizeToStringArray = (val) => {
    if (!val) return [];

    // If string, split into lines/bullets or wrap into array
    if (typeof val === "string") {
        const lines = val
            .split(/\r?\n/)
            .map(l => l.replace(/^[-*•\d.)\s]+/, '').trim())
            .filter(Boolean);
        return lines.length > 0 ? lines : [val.trim()];
    }

    if (Array.isArray(val)) {
        return val.map(item => {
            if (typeof item === 'object' && item !== null) {
                const task = item.task || item.item || item.description || item.action || item.title || '';
                const owner = item.owner || item.assignee || item.who || '';
                const deadline = item.deadline || item.dueDate || item.date || '';

                if (task && owner) {
                    return `${task} (Owner: ${owner}${deadline ? `, Deadline: ${deadline}` : ''})`;
                } else if (task) {
                    return task;
                }
                return Object.values(item).filter(v => typeof v === 'string' && v.trim()).join(' - ') || JSON.stringify(item);
            }
            return String(item).trim();
        }).filter(Boolean);
    }

    return [];
};

const generateSummary = async (req, res) => {
    const { id } = req.params;
    
    try {
        const meeting = await MeetingSession.findById(id);
        if (!meeting) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "Meeting session not found." });
        }

        const validTranscripts = (meeting.transcript || []).filter(
            t => t && typeof t.text === "string" && t.text.trim().length > 0
        );

        if (validTranscripts.length === 0) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                message: "No spoken transcript recorded for this meeting. Cannot generate summary." 
            });
        }

        // Format transcript into a single readable string
        const formattedTranscript = validTranscripts
            .map(t => `${t.speaker || "Participant"}: ${t.text.trim()}`)
            .join("\n");

        if (!process.env.GROQ_API_KEY) {
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ 
                message: "GROQ_API_KEY is not configured on the server. Please check your environment variables." 
            });
        }

        // Initialize Groq SDK
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        let parsedData = null;
        let lastError = null;

        // Iterate through candidates in order of capability and speed
        for (const model of GROQ_MODELS) {
            try {
                console.log(`[AI Summary] Requesting summary using model: ${model}`);
                const chatCompletion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert executive meeting assistant. Analyze the raw meeting transcript. It may contain speech-to-text noise or brief exchanges. Extract: 1) Executive Summary (concise bullet points summarizing discussions), 2) Action Items (tasks assigned, owners, deadlines), 3) Key Decisions. Format strictly as JSON with this exact schema: { \"summary\": [\"...\"], \"actionItems\": [\"...\"], \"decisions\": [\"...\"] }."
                        },
                        {
                            role: "user",
                            content: `Here is the meeting transcript:\n\n${formattedTranscript}`
                        }
                    ],
                    model: model,
                    response_format: { type: "json_object" }
                });

                const content = chatCompletion.choices?.[0]?.message?.content;
                parsedData = extractAndParseJson(content);
                console.log(`[AI Summary] Successfully generated and parsed summary with model: ${model}`);
                break; // Successfully generated summary
            } catch (err) {
                console.warn(`[AI Summary] Model ${model} failed (${err.status || err.message}). Attempting next candidate...`);
                lastError = err;
            }
        }

        if (!parsedData) {
            throw new Error(lastError?.message || "All AI models failed to generate summary.");
        }

        // Update document with sanitized arrays
        meeting.aiSummary = sanitizeToStringArray(parsedData.summary);
        meeting.actionItems = sanitizeToStringArray(parsedData.actionItems);
        meeting.decisions = sanitizeToStringArray(parsedData.decisions);
        
        // Fallback placeholder if all arrays were somehow empty
        if (meeting.aiSummary.length === 0 && meeting.actionItems.length === 0 && meeting.decisions.length === 0) {
            meeting.aiSummary = ["Meeting concluded with brief discussion."];
        }

        await meeting.save();

        return res.status(httpStatus.OK).json({
            message: "Summary generated successfully",
            meeting
        });

    } catch (e) {
        console.error("Error generating summary:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ 
            message: `Failed to generate summary: ${e.message || e}` 
        });
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
