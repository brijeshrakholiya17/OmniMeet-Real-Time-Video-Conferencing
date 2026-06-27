import jwt from "jsonwebtoken";
import { User } from "../models/users.model.js";
import httpStatus from "http-status";

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid user token" });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Unauthorized: Invalid or expired token" });
    }
};
