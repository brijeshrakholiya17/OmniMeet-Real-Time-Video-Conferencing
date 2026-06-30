import { Server } from "socket.io"
import { MeetingSession } from "../models/meeting.model.js"
import jwt from "jsonwebtoken"

let connections = {}
let messages = {}
let timeOnline = {}
let transcripts = {}
let roomStartTime = {}
let socketToUser = {}
let roomUsers = {}
let whiteboardHistory = {}

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        socket.on("join-call", (path, token) => {
            socket.join(path);
            if (connections[path] === undefined) {
                connections[path] = []
                roomStartTime[path] = new Date();
                transcripts[path] = [];
                whiteboardHistory[path] = [];
            }
            connections[path].push(socket.id)
            timeOnline[socket.id] = new Date();

            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
                    if (decoded && decoded.id) {
                        socketToUser[socket.id] = decoded.id;
                        if (roomUsers[path] === undefined) {
                            roomUsers[path] = [];
                        }
                        if (!roomUsers[path].includes(decoded.id)) {
                            roomUsers[path].push(decoded.id);
                        }
                    }
                } catch (err) {
                    console.error("Token verification failed in socket connection:", err.message);
                }
            }

            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path])
            }

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender'])
                }
            }

            if (whiteboardHistory[path] !== undefined) {
                io.to(socket.id).emit("whiteboard-state", whiteboardHistory[path]);
            }
        })

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("chat-message", (data, sender) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) return [roomKey, true];
                    return [room, isFound];
                }, ['', false]);

            if (found === true) {
                if (messages[matchingRoom] === undefined) messages[matchingRoom] = []
                messages[matchingRoom].push({ 'sender': sender, "data": data, "socket-id-sender": socket.id })
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id)
                })
            }
        })

        socket.on("new-transcript-segment", (data) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) return [roomKey, true];
                    return [room, isFound];
                }, ['', false]);

            if (found === true) {
                if (transcripts[matchingRoom] === undefined) {
                    transcripts[matchingRoom] = [];
                }
                transcripts[matchingRoom].push({
                    speaker: data.speaker,
                    text: data.text,
                    timestamp: data.timestamp || new Date()
                });

                connections[matchingRoom].forEach((elem) => {
                    if (elem !== socket.id) {
                        io.to(elem).emit("new-transcript-segment", data);
                    }
                });
            }
        })

        socket.on("disconnect", () => {
            console.log("=== BEFORE CLEANUP ===");
            console.log("Connections keys:", Object.keys(connections));
            console.log("Messages keys:", Object.keys(messages));
            console.log("TimeOnline keys count:", Object.keys(timeOnline).length);

            var diffTime = Math.abs(timeOnline[socket.id] - new Date())
            var key
            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        key = k
                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit('user-left', socket.id)
                        }
                        var index = connections[key].indexOf(socket.id)
                        connections[key].splice(index, 1)
                        if (connections[key].length === 0) {
                            const roomTranscripts = transcripts[key] || [];
                            const startTime = roomStartTime[key] || new Date();
                            const endTime = new Date();
                            const meetingCode = key.split('/').pop() || "MEETING";
                            const roomUserList = roomUsers[key] || [];
                            const userId = roomUserList[0] || socketToUser[socket.id];
                            const roomWhiteboard = whiteboardHistory[key] || [];

                            delete connections[key];
                            delete messages[key];
                            delete transcripts[key];
                            delete roomStartTime[key];
                            delete roomUsers[key];
                            delete whiteboardHistory[key];

                            if (userId) {
                                (async () => {
                                    try {
                                        const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
                                        const newSession = new MeetingSession({
                                            userId,
                                            meetingCode,
                                            startTime: formatTime(startTime),
                                            endTime: formatTime(endTime),
                                            date: startTime,
                                            transcript: roomTranscripts,
                                            whiteboardStrokes: roomWhiteboard,
                                            aiSummary: [],
                                            actionItems: [],
                                            decisions: []
                                        });
                                        await newSession.save();
                                        console.log("MeetingSession successfully saved to database on room close.");
                                    } catch (dbErr) {
                                        console.error("Failed to save MeetingSession to database on room close:", dbErr);
                                    }
                                })();
                            } else {
                                console.warn("Could not save MeetingSession because no authenticated userId was associated with this room.");
                            }
                        }
                    }
                }
            }

            delete socketToUser[socket.id];
            delete timeOnline[socket.id];

            console.log("=== AFTER CLEANUP ===");
            console.log("Connections keys:", Object.keys(connections));
            console.log("Messages keys:", Object.keys(messages));
            console.log("TimeOnline keys count:", Object.keys(timeOnline).length);
        })

        // --- WHITEBOARD HANDLERS ---
        socket.on("whiteboard-stroke", (data) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) return [roomKey, true];
                    return [room, isFound];
                }, ['', false]);

            if (found === true) {
                if (whiteboardHistory[matchingRoom] === undefined) {
                    whiteboardHistory[matchingRoom] = [];
                }
                whiteboardHistory[matchingRoom].push(data);
                socket.broadcast.to(matchingRoom).emit('whiteboard-stroke', data);
            }
        });

        socket.on("whiteboard-clear", () => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) return [roomKey, true];
                    return [room, isFound];
                }, ['', false]);

            if (found === true) {
                whiteboardHistory[matchingRoom] = [];
                socket.broadcast.to(matchingRoom).emit('whiteboard-clear');
            }
        });

        socket.on("whiteboard-sync-full", (data) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) return [roomKey, true];
                    return [room, isFound];
                }, ['', false]);

            if (found === true) {
                whiteboardHistory[matchingRoom] = data;
                socket.broadcast.to(matchingRoom).emit('whiteboard-state', data);
            }
        });

        // --- SYNC HANDLERS (Video & Audio Only) ---
        socket.on("video-toggle", (isEnabled) => {
            broadcastToRoom(socket, "video-toggle", isEnabled);
        });

        socket.on("audio-toggle", (isEnabled) => {
            broadcastToRoom(socket, "audio-toggle", isEnabled);
        });

        const broadcastToRoom = (socket, event, data) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) return [roomKey, true];
                    return [room, isFound];
                }, ['', false]);

            if (found === true) {
                connections[matchingRoom].forEach((elem) => {
                    if (elem !== socket.id) {
                        io.to(elem).emit(event, socket.id, data);
                    }
                });
            }
        }
    })

    return io;
}