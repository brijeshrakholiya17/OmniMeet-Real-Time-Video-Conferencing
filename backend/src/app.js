import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.route.js";
import dotenv from "dotenv"; 

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

// Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("port", process.env.PORT || 8000);

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || "*", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// 1. Serve Static Files (The React App)
// This logic assumes your app.js is in 'backend/src/' and the build folder is in 'backend/build/'
const buildPath = path.join(__dirname, "../build"); 
app.use(express.static(buildPath));

// 2. API Routes
app.use("/api/v1/users", userRoutes);

// 3. Handle React Routing (Wildcard)
// CRITICAL: This must be placed AFTER your API routes.
// It catches any request that isn't an API call (like /home or /history) 
// and sends the React index.html so the frontend router can handle it.
app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
});

const start = async () => {
    try {
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