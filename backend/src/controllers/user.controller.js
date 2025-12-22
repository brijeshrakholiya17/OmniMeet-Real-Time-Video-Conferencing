import httpStatus from "http-status";
import bcrypt from "bcrypt";
import { User } from "../models/users.model.js";
import { Meeting } from "../models/meeting.model.js";
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
            password: hashedPassword
        });
        await newUser.save();
        return res.status(httpStatus.CREATED).json({ message: "User Registered Successfully" });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` });
    }
}

// --- NEW FUNCTION: Add Meeting to History ---
const addToActivity = async (req, res) => {
    const { token, meeting_code } = req.body;

    try {
        const user = await User.findOne({ token: token });
        
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }

        user.meetingHistory.push({
            meetingCode: meeting_code,
            date: new Date(),
            startTime: startTime,
            endTime: endTime
        });

        await user.save();
        return res.status(httpStatus.OK).json({ message: "Added to history" });

    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` });
    }
}

// --- NEW FUNCTION: Get User History ---
const getUserHistory = async (req, res) => {
    const { token } = req.query;

    try {
        const user = await User.findOne({ token: token });
        
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }

        return res.status(httpStatus.OK).json(user.meetingHistory);

    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` });
    }
}

// Export all 4 functions
export { login, register, addToActivity, getUserHistory };