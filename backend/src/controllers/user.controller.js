import httpStatus from "http-status";
import bcrypt from "bcrypt";
import { User } from "../models/users.model.js";
import jwt from "jsonwebtoken";

const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            let token = jwt.sign(
                { id: user._id },
                process.env.JWT_SECRET || "fallback_secret",
                { expiresIn: "24h" }
            );
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

// Secured with authMiddleware
const addToActivity = async (req, res) => {
    const { meeting_code, startTime, endTime } = req.body;

    try {
        const user = req.user;

        user.history.push({
            meetingCode: meeting_code,
            date: new Date(),
            startTime: startTime || "N/A",
            endTime: endTime || "N/A"
        });

        await user.save();
        return res.status(httpStatus.OK).json({ message: "Added to history" });

    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` });
    }
}

// Secured with authMiddleware
const getUserHistory = async (req, res) => {
    try {
        const user = req.user;
        return res.status(httpStatus.OK).json(user.history || []);
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` });
    }
}

export { login, register, addToActivity, getUserHistory };