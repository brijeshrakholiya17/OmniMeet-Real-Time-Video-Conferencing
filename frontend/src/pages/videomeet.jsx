import React, { useEffect, useRef, useState, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button, Tabs, Tab, Box, useTheme, useMediaQuery, Menu, MenuItem, Typography, Snackbar, Alert, Tooltip } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import InfoIcon from '@mui/icons-material/Info';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClosedCaptionIcon from '@mui/icons-material/ClosedCaption';
import BrushIcon from '@mui/icons-material/Brush';
import Whiteboard from '../components/Whiteboard';
import server from '../environment';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';

const server_url = server;

// connections global variable removed to prevent cross-session leaks

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

export default function VideoMeetComponent() {
    const router = useNavigate();
    const { url } = useParams();

    var socketRef = useRef();
    let socketIdRef = useRef();
    let localVideoref = useRef();
    let usernameMapRef = useRef({});
    const connectionsRef = useRef({});
    const pendingICEQueue = useRef({});

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState(false);
    let [audio, setAudio] = useState(false);
    let [screen, setScreen] = useState(false);

    let [showModal, setModal] = useState(false);
    let [showParticipants, setShowParticipants] = useState(false);
    let [showMeetingInfo, setShowMeetingInfo] = useState(false);

    let [messages, setMessages] = useState([]);
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);
    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");

    let [currentTime, setCurrentTime] = useState(new Date());
    let [copySuccess, setCopySuccess] = useState(false);
    let [screenAvailable, setScreenAvailable] = useState(false);

    const [transcripts, setTranscripts] = useState([]);
    const [showTranscript, setShowTranscript] = useState(false);
    const transcriptEndRef = useRef(null);
    const [currentCaption, setCurrentCaption] = useState({ username: "", text: "" });
    const captionTimeoutRef = useRef(null);

    const startTimeRef = useRef(new Date());

    const [videos, setVideos] = useState([]);
    const [sidebarWidth, setSidebarWidth] = useState(360);
    const [isDragging, setIsDragging] = useState(false);

    const [showWhiteboard, setShowWhiteboard] = useState(false);
    const whiteboardHistoryRef = useRef([]);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [moreAnchorEl, setMoreAnchorEl] = useState(null);
    const handleMoreClick = (event) => setMoreAnchorEl(event.currentTarget);
    const handleMoreClose = () => setMoreAnchorEl(null);

    const [isHost, setIsHost] = useState(false);
    const [endCallAnchorEl, setEndCallAnchorEl] = useState(null);
    const audioRecorderRef = useRef(null);
    const audioRef = useRef(audio);

    useEffect(() => {
        audioRef.current = audio;
    }, [audio]);

    const handleEndCallClick = (event) => {
        if (!isHost) {
            handleEndCall();
        } else {
            setEndCallAnchorEl(event.currentTarget);
        }
    };
    const handleEndCallClose = () => {
        setEndCallAnchorEl(null);
    };
    const handleLeaveMeeting = () => {
        handleEndCallClose();
        handleEndCall();
    };
    const handleEndMeetingForAll = () => {
        handleEndCallClose();
        if (socketRef.current) {
            socketRef.current.emit("end-meeting-for-all");
        }
        handleEndCall();
    };

    useEffect(() => {
        if (navigator.mediaDevices.getDisplayMedia) {
            setScreenAvailable(true);
        }

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        return () => {
            clearInterval(timer);

            if (socketRef.current) {
                socketRef.current.disconnect();
            }

            if (connectionsRef.current) {
                for (let id in connectionsRef.current) {
                    if (connectionsRef.current[id]) {
                        connectionsRef.current[id].close();
                    }
                }
                connectionsRef.current = {};
            }

            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
                window.localStream = null;
            }

            if (captionTimeoutRef.current) {
                clearTimeout(captionTimeoutRef.current);
            }

            pendingICEQueue.current = {};
        };
    }, [])

    // Auto-scroll transcripts
    useEffect(() => {
        if (transcriptEndRef.current) {
            transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [transcripts]);

    // MediaRecorder ingestion for continuous backend-bound streaming transcription
    useEffect(() => {
        if (askForUsername) return;

        const isMicMuted = !audio;
        const socket = socketRef.current;
        const roomPath = window.location.href;

        if (!isMicMuted) {
            const localStream = window.localStream;
            if (localStream && localStream.getAudioTracks().length > 0) {
                const options = { mimeType: 'audio/webm;codecs=opus' };
                try {
                    // Standard browsers require passing a MediaStream to MediaRecorder.
                    // We wrap the microphone track in a MediaStream to prevent TypeErrors.
                    const recordStream = new MediaStream([localStream.getAudioTracks()[0]]);
                    audioRecorderRef.current = new MediaRecorder(recordStream, options);

                    audioRecorderRef.current.ondataavailable = (event) => {
                        if (event.data && event.data.size > 0 && !isMicMuted && socket) {
                            socket.emit("stream-audio-chunk", {
                                roomId: roomPath,
                                chunk: event.data
                            });
                        }
                    };

                    audioRecorderRef.current.start(250);
                } catch (error) {
                    console.error("Failed to initialize MediaRecorder:", error);
                }
            }
        } else {
            if (audioRecorderRef.current && audioRecorderRef.current.state !== "inactive") {
                try {
                    audioRecorderRef.current.stop();
                } catch (error) {
                    console.error("Failed to stop MediaRecorder on mute:", error);
                }
            }
            audioRecorderRef.current = null;
        }

        return () => {
            if (audioRecorderRef.current && audioRecorderRef.current.state !== "inactive") {
                try {
                    audioRecorderRef.current.stop();
                } catch (error) {
                    console.error("Cleanup: Failed to stop MediaRecorder:", error);
                }
            }
            audioRecorderRef.current = null;
        };
    }, [askForUsername, audio, url]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            const newWidth = window.innerWidth - e.clientX;
            const minWidth = 250;
            const maxWidth = window.innerWidth * 0.5;
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    // --- LOBBY MEDIA PREVIEW LOGIC ---
    useEffect(() => {
        if (askForUsername) {
            if (video || audio) {
                getPermissions();
            } else {
                if (window.localStream) {
                    window.localStream.getTracks().forEach(track => track.stop());
                    window.localStream = null;
                    if (localVideoref.current) localVideoref.current.srcObject = null;
                }
            }
        }
    }, [video, audio, askForUsername]);

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("info");

    const triggerNotification = (msg, severity = "info") => {
        setSnackbarMsg(msg);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const getPermissions = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: video, audio: audio });
            window.localStream = stream;
            if (localVideoref.current) localVideoref.current.srcObject = stream;
        } catch (e) {
            console.warn("Media permissions denied or unavailable:", e);
            setVideo(false);
            setAudio(false);
            triggerNotification("Camera/Microphone access denied. Joined with audio/video placeholders.", "warning");
        }
    }

    // --- MEETING MEDIA ATTACH LOGIC ---
    useEffect(() => {
        if (!askForUsername && localVideoref.current && window.localStream) {
            localVideoref.current.srcObject = window.localStream;

            if (!screen) {
                window.localStream.getAudioTracks().forEach(track => {
                    if (!track.isDummy) track.enabled = audio;
                });
                window.localStream.getVideoTracks().forEach(track => {
                    if (!track.isDummy) track.enabled = video;
                });
            }
        }
    }, [video, audio, screen, askForUsername]);

    // --- DUMMY TRACKS ---
    const getSilentAudioTrack = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = ctx.createOscillator();
            const dst = ctx.createMediaStreamDestination();
            oscillator.connect(dst);
            oscillator.start();
            const track = dst.stream.getAudioTracks()[0];
            track.enabled = false;
            track.isDummy = true;
            return track;
        } catch (e) {
            console.warn("Failed to create dummy audio track:", e);
            return null;
        }
    }

    const getBlackVideoTrack = () => {
        try {
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 480;
            canvas.getContext('2d').fillRect(0, 0, 640, 480);
            const stream = canvas.captureStream(30);
            const track = stream.getVideoTracks()[0];
            track.enabled = false;
            track.isDummy = true;
            return track;
        } catch (e) {
            console.warn("Failed to create dummy video track:", e);
            return null;
        }
    }

    // --- MEDIA TOGGLE ---
    const updateMediaTrack = async (type) => {
        const isVideo = type === 'video';

        if (askForUsername) {
            if (isVideo) setVideo(!video);
            else setAudio(!audio);
            return;
        }

        const constraints = isVideo ? { video: true } : { audio: true };
        const targetState = isVideo ? !video : !audio;

        try {
            if (targetState) {
                const newStream = await navigator.mediaDevices.getUserMedia(constraints);
                const newTrack = isVideo ? newStream.getVideoTracks()[0] : newStream.getAudioTracks()[0];

                const oldTrack = isVideo
                    ? window.localStream?.getVideoTracks()[0]
                    : window.localStream?.getAudioTracks()[0];

                if (oldTrack) {
                    if (window.localStream) window.localStream.removeTrack(oldTrack);
                    oldTrack.stop();
                }
                if (window.localStream) window.localStream.addTrack(newTrack);

                for (let id in connectionsRef.current) {
                    const pc = connectionsRef.current[id];
                    if (pc && pc.connectionState !== "closed" && pc.signalingState !== "closed") {
                        const sender = pc.getSenders().find(s => s.track && s.track.kind === type);
                        if (sender) {
                            await sender.replaceTrack(newTrack).catch(err => console.warn(err));
                        } else {
                            try { pc.addTrack(newTrack, window.localStream); } catch (err) { }
                        }
                    }
                }

                if (localVideoref.current) localVideoref.current.srcObject = window.localStream;
                if (isVideo) setVideo(true); else setAudio(true);

                if (socketRef.current) socketRef.current.emit(isVideo ? 'video-toggle' : 'audio-toggle', true);

            } else {
                const dummyTrack = isVideo ? getBlackVideoTrack() : getSilentAudioTrack();
                const oldTrack = isVideo
                    ? window.localStream?.getVideoTracks()[0]
                    : window.localStream?.getAudioTracks()[0];

                if (oldTrack) {
                    if (window.localStream) window.localStream.removeTrack(oldTrack);
                    oldTrack.stop();
                }
                if (dummyTrack && window.localStream) window.localStream.addTrack(dummyTrack);

                for (let id in connectionsRef.current) {
                    const pc = connectionsRef.current[id];
                    if (pc && pc.connectionState !== "closed" && pc.signalingState !== "closed" && dummyTrack) {
                        const sender = pc.getSenders().find(s => s.track && s.track.kind === type);
                        if (sender) {
                            await sender.replaceTrack(dummyTrack).catch(err => console.warn(err));
                        }
                    }
                }

                if (localVideoref.current) localVideoref.current.srcObject = window.localStream;
                if (isVideo) setVideo(false); else setAudio(false);

                if (socketRef.current) socketRef.current.emit(isVideo ? 'video-toggle' : 'audio-toggle', false);
            }

        } catch (e) {
            console.warn("Media device request denied or unavailable:", e);
            if (isVideo) setVideo(false); else setAudio(false);
            triggerNotification(`${isVideo ? "Camera" : "Microphone"} access denied. Switched to placeholder.`, "warning");
        }
    }

    // --- SCREEN SHARE LOGIC (FIXED) ---
    const getDislayMedia = () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                .then(getDislayMediaSuccess)
                .catch((e) => {
                    console.warn("Display media cancelled or failed:", e);
                    setScreen(false);
                    triggerNotification("Screen sharing cancelled.", "info");
                });
        }
    }

    const getDislayMediaSuccess = (stream) => {
        try {
            const screenTrack = stream.getVideoTracks()[0];
            if (!screenTrack) return;

            if (window.localStream) {
                window.localStream.getVideoTracks().forEach(track => {
                    track.stop();
                    window.localStream.removeTrack(track);
                });
                window.localStream.addTrack(screenTrack);
            }

            if (localVideoref.current) localVideoref.current.srcObject = window.localStream;

            for (let id in connectionsRef.current) {
                if (id === socketIdRef.current) continue;
                const pc = connectionsRef.current[id];
                if (pc && pc.connectionState !== "closed" && pc.signalingState !== "closed") {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenTrack).catch(err => console.warn(err));
                    } else {
                        try { pc.addTrack(screenTrack, window.localStream); } catch (e) { }
                    }
                }
            }

            screenTrack.onended = async () => {
                setScreen(false);
                try {
                    const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    const cameraTrack = cameraStream.getVideoTracks()[0];

                    if (window.localStream) {
                        window.localStream.removeTrack(screenTrack);
                        window.localStream.addTrack(cameraTrack);
                    }
                    if (localVideoref.current) localVideoref.current.srcObject = window.localStream;

                    for (let id in connectionsRef.current) {
                        if (id === socketIdRef.current) continue;
                        const pc = connectionsRef.current[id];
                        if (pc && pc.connectionState !== "closed" && pc.signalingState !== "closed") {
                            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                            if (sender) sender.replaceTrack(cameraTrack).catch(err => console.warn(err));
                        }
                    }

                    setVideo(true);
                    if (socketRef.current) socketRef.current.emit('video-toggle', true);

                } catch (err) {
                    console.warn("Reverting to camera failed after screen share:", err);
                    setVideo(false);
                    if (socketRef.current) socketRef.current.emit('video-toggle', false);
                }
            };
        } catch (e) {
            console.warn("Error processing screen share stream:", e);
        }
    }

    const handleScreen = () => {
        if (!screen) {
            setScreen(true);
            getDislayMedia();
        } else {
            setScreen(false);
            // Manually stopping the track triggers the 'onended' event defined above
            if (window.localStream) {
                const screenTrack = window.localStream.getVideoTracks()[0];
                if (screenTrack) screenTrack.stop();
            }
        }
    }

    const handleEndCall = () => {
        try {
            if (localVideoref.current && localVideoref.current.srcObject) {
                let tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        } catch (e) { }

        const rawToken = localStorage.getItem("token");
        const isGuest = !rawToken || rawToken === "null" || rawToken === "undefined";
        router("/post-call", { state: { meetingCode: url, isGuest } });
    }

    const connect = async () => {
        setAskForUsername(false);

        if (!window.localStream) {
            window.localStream = new MediaStream();
        }

        if (video === false) {
            const dummyVideo = getBlackVideoTrack();
            if (window.localStream.getVideoTracks().length > 0) {
                window.localStream.removeTrack(window.localStream.getVideoTracks()[0]);
            }
            window.localStream.addTrack(dummyVideo);
        }

        if (audio === false) {
            const dummyAudio = getSilentAudioTrack();
            if (window.localStream.getAudioTracks().length > 0) {
                window.localStream.removeTrack(window.localStream.getAudioTracks()[0]);
            }
            window.localStream.addTrack(dummyAudio);
        }

        // Force MyCam to show stream
        setTimeout(() => {
            if (localVideoref.current) {
                localVideoref.current.srcObject = window.localStream;
            }
        }, 100);

        socketRef.current = io.connect(server_url, { secure: false });
        socketRef.current.on('connect', () => {
            socketIdRef.current = socketRef.current.id;
            const rawToken = localStorage.getItem("token");
            const token = (rawToken && rawToken !== "null" && rawToken !== "undefined") ? rawToken : null;
            const finalUsername = (username && username.trim() !== "") ? username : (token ? "User" : "Guest");
            socketRef.current.emit('join-call', window.location.href, token, finalUsername);
        });

        socketRef.current.on('signal', handleSignal);
        socketRef.current.on('video-toggle', (fromId, isEnabled) => setVideos(prev => prev.map(v => v.socketId === fromId ? { ...v, videoEnabled: isEnabled } : v)));
        socketRef.current.on('audio-toggle', (fromId, isEnabled) => setVideos(prev => prev.map(v => v.socketId === fromId ? { ...v, audioEnabled: isEnabled } : v)));
        socketRef.current.on('chat-message', addMessage);
        socketRef.current.on('new-live-caption', (data) => {
            if (captionTimeoutRef.current) {
                clearTimeout(captionTimeoutRef.current);
                captionTimeoutRef.current = null;
            }
            setCurrentCaption({ username: data.username, text: data.text });
            if (data.isFinal) {
                setTranscripts(prev => [...prev, {
                    speaker: data.username,
                    text: data.text,
                    timestamp: new Date()
                }]);
                captionTimeoutRef.current = setTimeout(() => {
                    setCurrentCaption({ username: "", text: "" });
                }, 3500);
            }
        });


        socketRef.current.on('whiteboard-state', (state) => {
            whiteboardHistoryRef.current = state;
        });
        socketRef.current.on('whiteboard-stroke', (stroke) => {
            whiteboardHistoryRef.current.push(stroke);
        });
        socketRef.current.on('whiteboard-clear', () => {
            whiteboardHistoryRef.current = [];
        });
        socketRef.current.on('you-are-host', (isHostFlag) => {
            setIsHost(isHostFlag);
        });
        socketRef.current.on('meeting-terminated', () => {
            handleEndCall();
        });
        socketRef.current.on('user-left', (id) => {
            setVideos(prev => prev.filter(v => v.socketId !== id));
            if (connectionsRef.current[id]) {
                connectionsRef.current[id].close();
                delete connectionsRef.current[id];
            }
            if (pendingICEQueue.current[id]) {
                delete pendingICEQueue.current[id];
            }
        });

        socketRef.current.on('user-joined', (id, clients) => {
            try {
                clients.forEach((socketListId) => {
                    if (socketListId === socketIdRef.current) return;
                    if (connectionsRef.current[socketListId]) return;

                    const pc = new RTCPeerConnection(peerConfigConnections);
                    connectionsRef.current[socketListId] = pc;

                    if (window.localStream) {
                        window.localStream.getTracks().forEach(track => {
                            try { pc.addTrack(track, window.localStream); } catch (err) { }
                        });
                    }

                    pc.onicecandidate = (event) => {
                        if (event.candidate != null && socketRef.current) {
                            if (pc.connectionState !== "closed" && pc.signalingState !== "closed") {
                                try {
                                    socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }));
                                } catch (err) {
                                    console.warn("ICE candidate emit suppressed:", err);
                                }
                            }
                        }
                    };

                    pc.ontrack = (event) => {
                        if (pc.connectionState === "closed") return;
                        try {
                            const stream = event.streams[0];
                            setVideos(prev => {
                                const exists = prev.find(v => v.socketId === socketListId);
                                if (exists) return prev;
                                return [...prev, {
                                    socketId: socketListId,
                                    stream: stream,
                                    username: usernameMapRef.current[socketListId] || "Participant",
                                    videoEnabled: true,
                                    audioEnabled: true
                                }];
                            });
                        } catch (err) {
                            console.warn("Track addition suppressed:", err);
                        }
                    };

                    if (id === socketIdRef.current) {
                        pc.createOffer().then((description) => {
                            if (pc.connectionState !== "closed" && pc.signalingState !== "closed") {
                                pc.setLocalDescription(description).then(() => {
                                    if (socketRef.current) {
                                        socketRef.current.emit('signal', socketListId, JSON.stringify({
                                            'sdp': pc.localDescription,
                                            'username': username,
                                            'videoEnabled': video,
                                            'audioEnabled': audio
                                        }));
                                    }
                                }).catch(e => console.warn(e));
                            }
                        }).catch(e => console.warn(e));
                    }
                });
            } catch (err) {
                console.warn("Error handling user-joined event:", err);
            }
        });
    }

    const handleSignal = async (fromId, message) => {
        try {
            if (fromId === socketIdRef.current) return;
            const pc = connectionsRef.current[fromId];
            if (!pc || pc.connectionState === "closed" || pc.signalingState === "closed") return;

            const signal = JSON.parse(message);
            if (signal.sdp) {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).catch(e => console.warn(e));

                if (pendingICEQueue.current[fromId]) {
                    while (pendingICEQueue.current[fromId].length > 0) {
                        const candidate = pendingICEQueue.current[fromId].shift();
                        if (pc.connectionState !== "closed" && pc.signalingState !== "closed") {
                            await pc.addIceCandidate(candidate).catch(e => console.warn(e));
                        }
                    }
                    delete pendingICEQueue.current[fromId];
                }

                if (signal.sdp.type === 'offer') {
                    const description = await pc.createAnswer();
                    if (pc.connectionState !== "closed" && pc.signalingState !== "closed") {
                        await pc.setLocalDescription(description);
                        if (socketRef.current) {
                            socketRef.current.emit('signal', fromId, JSON.stringify({
                                'sdp': pc.localDescription,
                                'username': username,
                                'videoEnabled': video,
                                'audioEnabled': audio
                            }));
                        }
                    }
                }
            }
            if (signal.ice) {
                const candidate = new RTCIceCandidate(signal.ice);
                if (pc.remoteDescription && pc.connectionState !== "closed" && pc.signalingState !== "closed") {
                    await pc.addIceCandidate(candidate).catch(e => console.warn(e));
                } else {
                    if (!pendingICEQueue.current[fromId]) {
                        pendingICEQueue.current[fromId] = [];
                    }
                    pendingICEQueue.current[fromId].push(candidate);
                }
            }
            if (signal.username) {
                usernameMapRef.current[fromId] = signal.username;
                setVideos(prev => prev.map(v => v.socketId === fromId ? {
                    ...v,
                    username: signal.username,
                    videoEnabled: signal.videoEnabled,
                    audioEnabled: signal.audioEnabled
                } : v));
            }
        } catch (err) {
            console.warn("Error in handleSignal:", err);
        }
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages(prev => [...prev, { sender: sender, data: data }]);
        if (socketIdSender !== socketIdRef.current) { setNewMessages(prev => prev + 1); }
    };
    const sendMessage = () => { socketRef.current.emit('chat-message', message, username); setMessage(""); }
    const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const toggleChat = () => { setModal(!showModal); setShowParticipants(false); setShowTranscript(false); setNewMessages(0); }
    const toggleParticipants = () => { setShowParticipants(!showParticipants); setModal(false); setShowTranscript(false); }
    const toggleTranscript = () => { setShowTranscript(!showTranscript); setModal(false); setShowParticipants(false); }
    const handleCopyLink = () => { navigator.clipboard.writeText(window.location.href); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); }

    const handleLocalStroke = (stroke) => {
        whiteboardHistoryRef.current.push(stroke);
    };
    const handleLocalClear = () => {
        whiteboardHistoryRef.current = [];
    };
    const handleLocalUndo = (newHistory) => {
        whiteboardHistoryRef.current = newHistory;
    };

    return (
        <div className={styles.meetRootContainer}>
            {askForUsername ? (
                <div className={styles.lobbyStage}>
                    {/* Ambient Glow Orbs */}
                    <div className={styles.lobbyGlow1}></div>
                    <div className={styles.lobbyGlow2}></div>
                    <div className={styles.lobbyGridOverlay}></div>

                    <div className={styles.lobbyMainHub}>
                        {/* Left Stage: Camera Preview */}
                        <div className={styles.lobbyPreviewSide}>
                            <div className={styles.previewHeader}>
                                <div className={styles.previewLivePill}>
                                    <span className={styles.pulseGreenDot}></span>
                                    <span>AUDIO / VIDEO READY</span>
                                </div>
                                <span className={styles.previewRes}>1080P HD</span>
                            </div>

                            <div className={styles.lobbyVideoFrame}>
                                <video
                                    className={styles.lobbyVideoPreview}
                                    ref={localVideoref}
                                    autoPlay
                                    muted
                                    style={{ display: video ? 'block' : 'none' }}
                                />
                                {!video && (
                                    <div className={styles.lobbyCameraOffPlaceholder}>
                                        <div className={styles.avatarCircleLobby}>
                                            {username ? username.charAt(0).toUpperCase() : <AccountCircleIcon sx={{ fontSize: 60 }} />}
                                        </div>
                                        <p className={styles.camOffLabel}>Camera is currently turned off</p>
                                    </div>
                                )}

                                {/* Floating Hardware Controls */}
                                <div className={styles.lobbyFloatingControls}>
                                    <Tooltip title={video ? "Disable Camera" : "Enable Camera"}>
                                        <button
                                            type="button"
                                            onClick={() => updateMediaTrack('video')}
                                            className={`${styles.lobbyMediaBtn} ${video ? styles.btnOn : styles.btnOff}`}
                                        >
                                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                                            <span>{video ? "Cam On" : "Cam Off"}</span>
                                        </button>
                                    </Tooltip>

                                    <Tooltip title={audio ? "Mute Microphone" : "Unmute Microphone"}>
                                        <button
                                            type="button"
                                            onClick={() => updateMediaTrack('audio')}
                                            className={`${styles.lobbyMediaBtn} ${audio ? styles.btnOn : styles.btnOff}`}
                                        >
                                            {audio ? <MicIcon /> : <MicOffIcon />}
                                            <span>{audio ? "Mic On" : "Muted"}</span>
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>

                        {/* Right Stage: Setup Details & Join Form */}
                        <div className={styles.lobbySetupSide}>
                            <div className={styles.lobbyBrandPill}>
                                <VideoCallIcon sx={{ color: '#FF453A', fontSize: 20 }} />
                                <span>OmniMeet Studio Room</span>
                            </div>

                            <div className={styles.lobbyRoomDetails}>
                                <h1 className={styles.lobbyHeading}>Ready to Connect?</h1>
                                <p className={styles.lobbySub}>
                                    Room: <strong className={styles.roomCodeBadge}>{url || window.location.pathname.split('/').pop()}</strong>
                                </p>
                            </div>

                            <div className={styles.lobbyFormBox}>
                                <div className={styles.inputWrapperLobby}>
                                    <label className={styles.lobbyInputLabel}>Display Name</label>
                                    <TextField
                                        className={styles.lobbyNameInput}
                                        placeholder="Enter your full name"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && username.trim()) { e.preventDefault(); connect(); } }}
                                        variant="outlined"
                                        autoComplete="off"
                                        fullWidth
                                    />
                                </div>

                                <Button
                                    variant="contained"
                                    onClick={connect}
                                    disabled={!username.trim()}
                                    className={styles.lobbyJoinBtn}
                                    endIcon={<VideoCallIcon />}
                                >
                                    Join Meeting Now
                                </Button>
                            </div>

                            <div className={styles.lobbySecurityFooter}>
                                <span className={styles.secShield}>🔒</span>
                                <span>End-to-End Encrypted WebRTC Session</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>
                    <div className={styles.mainStage}>

                        {/* Top Studio Bar */}
                        <header className={styles.studioTopBar}>
                            <div className={styles.topBarLeft}>
                                <div className={styles.topBrandLogo}>
                                    <div className={styles.brandIconMini}>
                                        <VideoCallIcon fontSize="small" />
                                    </div>
                                    <span className={styles.brandTitleMini}>OmniMeet</span>
                                </div>

                                <button
                                    className={styles.meetingCodeChip}
                                    onClick={() => setShowMeetingInfo(!showMeetingInfo)}
                                    title="View Meeting Details"
                                >
                                    <InfoOutlinedIcon fontSize="small" className={styles.infoSvg} />
                                    <span className={styles.codeText}>{url || window.location.pathname.split('/').pop()}</span>
                                </button>
                            </div>

                            <div className={styles.topBarCenter}>
                                <div className={styles.telemetryBadge}>
                                    <span className={styles.livePulseDot}></span>
                                    <span>P2P Mesh • &lt; 15ms</span>
                                </div>
                            </div>

                            <div className={styles.topBarRight}>
                                <div className={styles.sessionClock}>
                                    <span>{formatTime(currentTime)}</span>
                                </div>
                            </div>
                        </header>

                        {/* Video Grid & Content Area */}
                        <div className={styles.mediaStageArea}>

                            {/* Meeting Info Popup Card */}
                            {showMeetingInfo && (
                                <div className={styles.meetingInfoCard}>
                                    <div className={styles.meetingInfoHeader}>
                                        <h3>Meeting Information</h3>
                                        <IconButton size="small" onClick={() => setShowMeetingInfo(false)} sx={{ color: '#000000 !important', '&:hover': { backgroundColor: '#E2E8F0' } }}>
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </div>
                                    <div className={styles.infoSection}>
                                        <span className={styles.infoLabel}>Direct Room URL</span>
                                        <div className={styles.linkBox}>
                                            <span className={styles.linkText}>{window.location.href}</span>
                                            <IconButton size="small" onClick={handleCopyLink} sx={{ color: '#FF453A' }}>
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </div>
                                        {copySuccess && <p className={styles.copySuccess}>Link copied to clipboard!</p>}
                                    </div>
                                </div>
                            )}

                            {/* Floating Local PiP Video Widget - hidden on mobile when whiteboard is open */}
                            {(!isMobile || !showWhiteboard) && (
                                <div className={styles.localPipCard}>
                                    <div className={styles.pipOverlayTop}>
                                        <span className={styles.pipUserTag}>{username} (You)</span>
                                        <div className={styles.pipMicIcon}>
                                            {audio ? <MicIcon fontSize="inherit" sx={{ color: '#10B981' }} /> : <MicOffIcon fontSize="inherit" sx={{ color: '#FF453A' }} />}
                                        </div>
                                    </div>

                                    <video
                                        className={styles.localVideo}
                                        ref={localVideoref}
                                        autoPlay
                                        muted
                                        style={{ display: video ? 'block' : 'none' }}
                                    />
                                    {!video && (
                                        <div className={styles.videoOffPlaceholder}>
                                            <div className={styles.avatarPip}>
                                                {username ? username.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Main Interactive Stage: Whiteboard or Video Grid */}
                            {showWhiteboard ? (
                                <div className={styles.whiteboardContainer}>
                                    <button
                                        className={styles.whiteboardTopRightCloseBtn}
                                        onClick={() => setShowWhiteboard(false)}
                                        title="Close Whiteboard"
                                    >
                                        <CloseIcon fontSize="small" />
                                    </button>
                                    <Whiteboard
                                        socket={socketRef.current}
                                        room={window.location.href}
                                        initialHistory={whiteboardHistoryRef.current}
                                        onStrokeAdded={handleLocalStroke}
                                        onClearBoard={handleLocalClear}
                                        onUndo={handleLocalUndo}
                                        onClose={() => setShowWhiteboard(false)}
                                    />
                                </div>
                            ) : (
                                <div className={styles.conferenceGrid}>
                                    {videos.length === 0 ? (
                                        <div className={styles.singleParticipantStage}>
                                            <div className={styles.soloStageCard}>
                                                <div className={styles.soloSvgWrapper}>
                                                    <VideoCallIcon sx={{ fontSize: 48, color: '#00F2FE' }} />
                                                </div>
                                                <h2>You are in the meeting</h2>
                                                <p>Share the link with teammates to start collaborating in real-time.</p>
                                                <Button
                                                    variant="contained"
                                                    onClick={handleCopyLink}
                                                    startIcon={<ContentCopyIcon />}
                                                    className={styles.copyInviteBtn}
                                                >
                                                    {copySuccess ? "Link Copied!" : "Copy Invite Link"}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        videos.map((videoObj) => (
                                            <div key={videoObj.socketId} className={styles.remoteVideoContainer}>
                                                <div className={styles.userInfoOverlay}>
                                                    <div className={styles.participantDot}></div>
                                                    <span className={styles.usernameText}>{videoObj.username || "Participant"}</span>
                                                </div>

                                                <div className={styles.micStatusOverlay}>
                                                    {videoObj.audioEnabled !== false ?
                                                        <MicIcon fontSize="small" sx={{ color: '#10B981' }} /> :
                                                        <MicOffIcon fontSize="small" sx={{ color: '#FF453A' }} />
                                                    }
                                                </div>

                                                <video
                                                    className={styles.remoteVideo}
                                                    ref={ref => {
                                                        if (ref && videoObj.stream) {
                                                            if (ref.srcObject !== videoObj.stream) ref.srcObject = videoObj.stream;
                                                        }
                                                    }}
                                                    autoPlay
                                                    playsInline
                                                    style={{ display: videoObj.videoEnabled !== false ? 'block' : 'none' }}
                                                />

                                                <div className={styles.videoOffPlaceholder} style={{ display: videoObj.videoEnabled !== false ? 'none' : 'flex' }}>
                                                    <div className={styles.avatarCircleRemote}>
                                                        {(videoObj.username || "P").charAt(0).toUpperCase()}
                                                    </div>
                                                    <p className={styles.videoOffText}>{videoObj.username || "Participant"} (Camera Off)</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Real-time Closed Captions Banner */}
                            {currentCaption.text && (
                                <div className={styles.captionsFloatingBanner}>
                                    <span className={styles.captionSpeaker}>
                                        {currentCaption.username}:
                                    </span>
                                    <span className={styles.captionContent}>{currentCaption.text}</span>
                                </div>
                            )}
                        </div>

                        {/* Floating Apple/Linear Style Control Dock */}
                        <div className={styles.floatingControlDock}>
                            {/* Camera Toggle */}
                            <Tooltip title={video ? "Turn Camera Off" : "Turn Camera On"}>
                                <button
                                    onClick={() => updateMediaTrack('video')}
                                    className={`${styles.dockActionBtn} ${video ? styles.dockActive : styles.dockMuted}`}
                                >
                                    {video ? <VideocamIcon /> : <VideocamOffIcon />}
                                </button>
                            </Tooltip>

                            {/* Mic Toggle */}
                            <Tooltip title={audio ? "Mute Microphone" : "Unmute Microphone"}>
                                <button
                                    onClick={() => updateMediaTrack('audio')}
                                    className={`${styles.dockActionBtn} ${audio ? styles.dockActive : styles.dockMuted}`}
                                >
                                    {audio ? <MicIcon /> : <MicOffIcon />}
                                </button>
                            </Tooltip>

                            {/* Desktop Additional Controls */}
                            {!isMobile && (
                                <>
                                    {screenAvailable && (
                                        <Tooltip title={screen ? "Stop Sharing Screen" : "Share Screen"}>
                                            <button
                                                onClick={handleScreen}
                                                className={`${styles.dockActionBtn} ${screen ? styles.dockHighlightCyan : styles.dockNormal}`}
                                            >
                                                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                                            </button>
                                        </Tooltip>
                                    )}

                                    <Tooltip title="Live Chat">
                                        <Badge badgeContent={newMessages} color="error" className={styles.dockBadge}>
                                            <button
                                                onClick={toggleChat}
                                                className={`${styles.dockActionBtn} ${showModal ? styles.dockHighlightCoral : styles.dockNormal}`}
                                            >
                                                <ChatIcon />
                                            </button>
                                        </Badge>
                                    </Tooltip>

                                    <Tooltip title="Participants Roster">
                                        <button
                                            onClick={toggleParticipants}
                                            className={`${styles.dockActionBtn} ${showParticipants ? styles.dockHighlightCyan : styles.dockNormal}`}
                                        >
                                            <PeopleIcon />
                                        </button>
                                    </Tooltip>

                                    <Tooltip title="Live Transcript">
                                        <button
                                            onClick={toggleTranscript}
                                            className={`${styles.dockActionBtn} ${showTranscript ? styles.dockHighlightViolet : styles.dockNormal}`}
                                        >
                                            <ClosedCaptionIcon />
                                        </button>
                                    </Tooltip>

                                    <Tooltip title="Interactive Whiteboard">
                                        <button
                                            onClick={() => setShowWhiteboard(!showWhiteboard)}
                                            className={`${styles.dockActionBtn} ${showWhiteboard ? styles.dockHighlightCoral : styles.dockNormal}`}
                                        >
                                            <BrushIcon />
                                        </button>
                                    </Tooltip>
                                </>
                            )}

                            {/* Mobile Three-Dots More Menu */}
                            {isMobile && (
                                <>
                                    <button
                                        onClick={handleMoreClick}
                                        className={`${styles.dockActionBtn} ${moreAnchorEl ? styles.dockHighlightCyan : styles.dockNormal}`}
                                        title="More Meeting Options"
                                    >
                                        <MoreVertIcon />
                                    </button>
                                    <Menu
                                        anchorEl={moreAnchorEl}
                                        open={Boolean(moreAnchorEl)}
                                        onClose={handleMoreClose}
                                        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                                        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                                        PaperProps={{
                                            elevation: 4,
                                            sx: {
                                                backgroundColor: '#FFFFFF !important',
                                                border: '1.5px solid #E2E8F0 !important',
                                                borderRadius: '20px !important',
                                                padding: '8px !important',
                                                minWidth: '230px !important',
                                                boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.04) !important',
                                            }
                                        }}
                                        sx={{
                                            '& .MuiMenuItem-root': {
                                                borderRadius: '12px !important',
                                                padding: '10px 14px !important',
                                                margin: '3px 0 !important',
                                                color: '#0F172A !important',
                                                fontWeight: '600 !important',
                                                fontSize: '0.9rem !important',
                                                gap: '12px !important',
                                                transition: 'all 0.15s ease !important',
                                                '&:hover': {
                                                    backgroundColor: '#F1F5F9 !important',
                                                    color: '#0284C7 !important'
                                                }
                                            }
                                        }}
                                    >
                                        {screenAvailable && (
                                            <MenuItem onClick={() => { handleMoreClose(); handleScreen(); }}>
                                                {screen ? <StopScreenShareIcon fontSize="small" sx={{ color: '#FF453A' }} /> : <ScreenShareIcon fontSize="small" sx={{ color: '#0284C7' }} />}
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{screen ? 'Stop Sharing' : 'Share Screen'}</Typography>
                                            </MenuItem>
                                        )}
                                        <MenuItem onClick={() => { handleMoreClose(); toggleChat(); }}>
                                            <Badge badgeContent={newMessages} color="error">
                                                <ChatIcon fontSize="small" sx={{ color: '#0284C7' }} />
                                            </Badge>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Chat Room</Typography>
                                        </MenuItem>
                                        <MenuItem onClick={() => { handleMoreClose(); toggleParticipants(); }}>
                                            <PeopleIcon fontSize="small" sx={{ color: '#0284C7' }} />
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Participants ({videos.length + 1})</Typography>
                                        </MenuItem>
                                        <MenuItem onClick={() => { handleMoreClose(); toggleTranscript(); }}>
                                            <ClosedCaptionIcon fontSize="small" sx={{ color: showTranscript ? '#FF453A' : '#7C3AED' }} />
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: showTranscript ? '#FF453A' : '#0F172A' }}>Live Transcript</Typography>
                                        </MenuItem>
                                        <MenuItem onClick={() => { handleMoreClose(); setShowWhiteboard(!showWhiteboard); }}>
                                            <BrushIcon fontSize="small" sx={{ color: '#FF453A' }} />
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: showWhiteboard ? '#FF453A' : '#0F172A' }}>Whiteboard</Typography>
                                        </MenuItem>
                                        <MenuItem onClick={() => { handleMoreClose(); setShowMeetingInfo(true); }}>
                                            <InfoOutlinedIcon fontSize="small" sx={{ color: '#0284C7' }} />
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Meeting Info</Typography>
                                        </MenuItem>
                                        <MenuItem onClick={() => { handleMoreClose(); handleCopyLink(); }}>
                                            <ContentCopyIcon fontSize="small" sx={{ color: '#10B981' }} />
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{copySuccess ? 'Link Copied!' : 'Copy Meeting Link'}</Typography>
                                        </MenuItem>
                                    </Menu>
                                </>
                            )}

                            {/* Desktop More Options */}
                            {!isMobile && (
                                <>
                                    <Tooltip title="More Options">
                                        <button
                                            onClick={handleMoreClick}
                                            className={`${styles.dockActionBtn} ${moreAnchorEl ? styles.dockActive : styles.dockNormal}`}
                                        >
                                            <MoreVertIcon />
                                        </button>
                                    </Tooltip>
                                    <Menu
                                        anchorEl={moreAnchorEl}
                                        open={Boolean(moreAnchorEl)}
                                        onClose={handleMoreClose}
                                        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                                        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                                        PaperProps={{
                                            elevation: 4,
                                            sx: {
                                                backgroundColor: '#FFFFFF !important',
                                                border: '1.5px solid #E2E8F0 !important',
                                                borderRadius: '20px !important',
                                                padding: '8px !important',
                                                minWidth: '220px !important',
                                                boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.04) !important',
                                            }
                                        }}
                                        sx={{
                                            '& .MuiMenuItem-root': {
                                                borderRadius: '12px !important',
                                                padding: '10px 14px !important',
                                                margin: '3px 0 !important',
                                                color: '#0F172A !important',
                                                fontWeight: '600 !important',
                                                fontSize: '0.9rem !important',
                                                gap: '12px !important',
                                                transition: 'all 0.15s ease !important',
                                                '&:hover': {
                                                    backgroundColor: '#F1F5F9 !important',
                                                    color: '#0284C7 !important'
                                                }
                                            }
                                        }}
                                    >
                                        <MenuItem onClick={() => { handleMoreClose(); setShowMeetingInfo(true); }}>
                                            <InfoOutlinedIcon fontSize="small" sx={{ color: '#0284C7' }} />
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Meeting Details</Typography>
                                        </MenuItem>
                                        <MenuItem onClick={() => { handleMoreClose(); handleCopyLink(); }}>
                                            <ContentCopyIcon fontSize="small" sx={{ color: '#10B981' }} />
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{copySuccess ? 'Link Copied!' : 'Copy Room Link'}</Typography>
                                        </MenuItem>
                                    </Menu>
                                </>
                            )}

                            {/* End Call Button */}
                            <Tooltip title="Leave Meeting">
                                <button
                                    onClick={handleEndCallClick}
                                    className={styles.dockEndCallBtn}
                                >
                                    <CallEndIcon />
                                    <span>Leave</span>
                                </button>
                            </Tooltip>

                            {isHost && (
                                <Menu
                                    anchorEl={endCallAnchorEl}
                                    open={Boolean(endCallAnchorEl)}
                                    onClose={handleEndCallClose}
                                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                                    transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                                    PaperProps={{
                                        elevation: 4,
                                        sx: {
                                            backgroundColor: '#FFFFFF !important',
                                            border: '1.5px solid #E2E8F0 !important',
                                            borderRadius: '20px !important',
                                            padding: '8px !important',
                                            minWidth: '210px !important',
                                            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.04) !important',
                                        }
                                    }}
                                    sx={{
                                        '& .MuiMenuItem-root': {
                                            borderRadius: '12px !important',
                                            padding: '10px 14px !important',
                                            margin: '3px 0 !important',
                                            color: '#0F172A !important',
                                            fontWeight: '700 !important',
                                            fontSize: '0.9rem !important',
                                            gap: '12px !important',
                                            transition: 'all 0.15s ease !important',
                                            '&:hover': {
                                                backgroundColor: '#F1F5F9 !important'
                                            }
                                        }
                                    }}
                                >
                                    <MenuItem onClick={handleLeaveMeeting}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Leave Meeting</Typography>
                                    </MenuItem>
                                    <MenuItem onClick={handleEndMeetingForAll} sx={{ color: '#FF453A !important', '&:hover': { backgroundColor: '#FFF1F2 !important' } }}>
                                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#FF453A' }}>End Call for All</Typography>
                                    </MenuItem>
                                </Menu>
                            )}
                        </div>
                    </div>

                    {/* RESIZER & SIDEBAR CONTAINER */}
                    {(showParticipants || showModal || showTranscript) && (
                        <>
                            <div className={styles.resizer} onMouseDown={handleMouseDown} />
                            <div className={styles.sideBarContainer} style={{ width: `${sidebarWidth}px` }}>
                                <div className={styles.sidebarTabWrapper}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                                        <Tabs
                                            value={showModal ? 0 : showParticipants ? 1 : 2}
                                            onChange={(e, val) => {
                                                if (val === 0) {
                                                    setModal(true); setShowParticipants(false); setShowTranscript(false); setNewMessages(0);
                                                } else if (val === 1) {
                                                    setModal(false); setShowParticipants(true); setShowTranscript(false);
                                                } else {
                                                    setModal(false); setShowParticipants(false); setShowTranscript(true);
                                                }
                                            }}
                                            textColor="inherit"
                                            variant="fullWidth"
                                            sx={{
                                                flex: 1,
                                                '& .MuiTab-root': {
                                                    color: '#64748B',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 700,
                                                    fontFamily: 'var(--font-heading)',
                                                    textTransform: 'none',
                                                    minHeight: '44px'
                                                },
                                                '& .Mui-selected': { color: '#0284C7 !important', fontWeight: 800 },
                                                '& .MuiTabs-indicator': { backgroundColor: '#0284C7', height: '3px', borderRadius: '3px' }
                                            }}
                                        >
                                            <Tab label={`Chat${newMessages > 0 ? ` (${newMessages})` : ''}`} />
                                            <Tab label={`People (${videos.length + 1})`} />
                                            <Tab label="Transcript" />
                                        </Tabs>
                                        <IconButton
                                            size="small"
                                            onClick={() => { setModal(false); setShowParticipants(false); setShowTranscript(false); }}
                                            sx={{ color: '#000000 !important', ml: 0.5, p: 0.8, borderRadius: '50%', '&:hover': { backgroundColor: '#E2E8F0' } }}
                                            title="Close Sidebar"
                                        >
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </div>

                                {/* Participants List */}
                                {showParticipants && (
                                    <div className={styles.sideBar}>
                                        <div className={styles.sideBarHeader}>
                                            <h3>Participants ({videos.length + 1})</h3>
                                            <IconButton size="small" onClick={() => setShowParticipants(false)} sx={{ color: '#000000 !important', '&:hover': { backgroundColor: '#E2E8F0' } }} title="Close Participants">
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </div>
                                        <div className={styles.participantsScrollList}>
                                            <div className={styles.participantItem}>
                                                <div className={styles.participantInfo}>
                                                    <div className={styles.participantAvatar}>{username.charAt(0).toUpperCase()}</div>
                                                    <div className={styles.participantDetailsCol}>
                                                        <span className={styles.participantNameText}>{username} (You)</span>
                                                        <span className={styles.participantRoleTag}>Host • Master Stream</span>
                                                    </div>
                                                </div>
                                                <div className={styles.participantStatusIcon}>
                                                    {audio ? <MicIcon fontSize="small" sx={{ color: '#10B981' }} /> : <MicOffIcon fontSize="small" sx={{ color: '#FF453A' }} />}
                                                </div>
                                            </div>
                                            {videos.map((v) => (
                                                <div key={v.socketId} className={styles.participantItem}>
                                                    <div className={styles.participantInfo}>
                                                        <div className={styles.participantAvatar}>{(v.username || "P").charAt(0).toUpperCase()}</div>
                                                        <div className={styles.participantDetailsCol}>
                                                            <span className={styles.participantNameText}>{v.username || "Participant"}</span>
                                                            <span className={styles.participantRoleTag}>Peer Mesh Connected</span>
                                                        </div>
                                                    </div>
                                                    <div className={styles.participantStatusIcon}>
                                                        {v.audioEnabled !== false ? <MicIcon fontSize="small" sx={{ color: '#10B981' }} /> : <MicOffIcon fontSize="small" sx={{ color: '#FF453A' }} />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Chat Sidebar */}
                                {showModal && (
                                    <div className={styles.sideBar}>
                                        <div className={styles.sideBarHeader}>
                                            <h3>In-Call Messages</h3>
                                            <IconButton size="small" onClick={() => setModal(false)} sx={{ color: '#000000 !important', '&:hover': { backgroundColor: '#E2E8F0' } }} title="Close Chat">
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </div>
                                        <div className={styles.chattingDisplay}>
                                            {messages.length === 0 ? (
                                                <div className={styles.emptyChatPlaceholder}>
                                                    <p>No messages yet. Say hello to everyone!</p>
                                                </div>
                                            ) : (
                                                messages.map((item, index) => (
                                                    <div key={index} className={`${styles.chatBubble} ${item.sender === username ? styles.msgLocal : styles.msgRemote}`}>
                                                        <span className={styles.senderName}>{item.sender === username ? 'You' : item.sender}</span>
                                                        <span className={styles.msgBodyText}>{item.data}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className={styles.chattingArea}>
                                            <TextField
                                                className={styles.textFieldOverride}
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }}
                                                placeholder="Type a message to everyone..."
                                                variant="outlined"
                                                size="small"
                                                autoComplete="off"
                                            />
                                            <Button
                                                variant='contained'
                                                onClick={sendMessage}
                                                disabled={!message.trim()}
                                                className={styles.chatSendBtn}
                                            >
                                                Send
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Transcript Panel */}
                                {showTranscript && (
                                    <div className={styles.sideBar}>
                                        <div className={styles.sideBarHeader}>
                                            <h3>Live Meeting Transcript</h3>
                                            <IconButton size="small" onClick={() => setShowTranscript(false)} sx={{ color: '#000000 !important', '&:hover': { backgroundColor: '#E2E8F0' } }} title="Close Transcript">
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </div>
                                        <div className={styles.transcriptScrollArea}>
                                            {transcripts.length === 0 ? (
                                                <div className={styles.emptyTranscriptNotice}>
                                                    <span className={styles.transcriptRadarDot}></span>
                                                    <p>Listening for speech... Start speaking and your live captions will transcribe in real time.</p>
                                                </div>
                                            ) : (
                                                transcripts.map((t, index) => (
                                                    <div key={index} className={styles.transcriptEntryCard}>
                                                        <div className={styles.transcriptEntryHeader}>
                                                            <span className={styles.transcriptSpeakerTag}>
                                                                {t.speaker}
                                                            </span>
                                                            <span className={styles.transcriptTimestamp}>
                                                                {t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                                                            </span>
                                                        </div>
                                                        <p className={styles.transcriptTextContent}>{t.text}</p>
                                                    </div>
                                                ))
                                            )}
                                            <div ref={transcriptEndRef} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMsg}
                </Alert>
            </Snackbar>
        </div>
    )
}