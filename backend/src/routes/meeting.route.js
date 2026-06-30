import { Router } from "express";
import { generateSummary, getUserMeetingSessions, deleteMeetingSession } from "../controllers/meeting.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Route to get all meeting sessions for the logged in user
router.route("/").get(authMiddleware, getUserMeetingSessions);

// Route to generate AI summary for a meeting session by ID
router.route("/:id/generate-summary").post(authMiddleware, generateSummary);

// Route to delete a meeting session by ID
router.route("/:id").delete(authMiddleware, deleteMeetingSession);

export default router;
