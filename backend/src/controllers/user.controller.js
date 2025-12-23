import httpStatus from "http-status";
import bcrypt from "bcrypt";
import { User } from "../models/users.model.js";
import crypto from "crypto";

const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            let token = crypto.randomBytes(20).toString("hex");
            user.token = token;
            await user.save();
            return res.status(httpStatus.OK).json({ token: token });
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid Credentials" });
        }
    } catch (e) {
        res.status(500).json({ message: `Something went wrong ${e}` });
    }
}

const register = async (req, res) => {
    const { username, password, name } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(httpStatus.CONFLICT).json({ message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name: name,
            username: username,
            password: hashedPassword,
            meetingHistory: [] // Initialize empty history
        });
        await newUser.save();
        return res.status(httpStatus.CREATED).json({ message: "User Registered Successfully" });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` });
    }
}

// --- FIX: Add Meeting to History ---
const addToActivity = async (req, res) => {
    // 1. Get startTime and endTime from the request
    const { token, meeting_code, startTime, endTime } = req.body;

    try {
        const user = await User.findOne({ token: token });
        
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }

        // 2. FIX: Use 'history' (not meetingHistory) to match your User Model
        user.history.push({
            meetingCode: meeting_code,
            date: new Date(),
            startTime: startTime || "N/A", // Save the times sent from frontend
            endTime: endTime || "N/A"
        });

        await user.save();
        return res.status(httpStatus.OK).json({ message: "Added to history" });

    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` });
    }
}

// --- FIX: Get User History ---
const getUserHistory = async (req, res) => {
    const { token } = req.query;

    try {
        const user = await User.findOne({ token: token });
        
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }

        // 3. FIX: Return 'history' array
        // We use || [] to prevent crashes if history is undefined
        return res.status(httpStatus.OK).json(user.history || []);

    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` });
    }
}

export { login, register, addToActivity, getUserHistory };