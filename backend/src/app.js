import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.route.js";
import dotenv from "dotenv"; 

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", process.env.PORT || 8000);

// CORS configuration: Allow requests from your Frontend URL
app.use(cors({
    origin: process.env.FRONTEND_URL || "*", // Fallback to * if not set
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);

app.get("/", (req, res) => {
    res.send("OmniMeet Backend is running");
});

const start = async () => {
    try {
        // SECURE CONNECTION: Using env variable instead of hardcoded string
        const connectionDb = await mongoose.connect(process.env.MONGO_URL);
        console.log("Database connected to OmniMeet :", connectionDb.connection.host);
    } catch (err) {
        console.error("MongoDB connection failed (continuing without DB):", err.message || err);
    }

    server.listen(app.get("port"), () => {
        console.log(`Server is running on port ${app.get("port")}`);
    });
};

start();