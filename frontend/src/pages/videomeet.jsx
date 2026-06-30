import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button, Tabs, Tab, Box } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import AccountCircleIcon from '@mui/icons-material/AccountCircle'; 
import InfoIcon from '@mui/icons-material/Info';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClosedCaptionIcon from '@mui/icons-material/ClosedCaption';
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

    const startTimeRef = useRef(new Date()); 

    const [videos, setVideos] = useState([]);
    const [sidebarWidth, setSidebarWidth] = useState(360);
    const [isDragging, setIsDragging] = useState(false);

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

            pendingICEQueue.current = {};
        };
    }, [])

    // Auto-scroll transcripts
    useEffect(() => {
        if (transcriptEndRef.current) {
            transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [transcripts]);

    // Web Speech API client transcription
    useEffect(() => {
        if (askForUsername) return;
        if (!audio) return; // Only transcribe when unmuted

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Web Speech API is not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            if (!audio) return;
            
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    const speechText = event.results[i][0].transcript.trim();
                    if (speechText) {
                        const timestamp = new Date();
                        const segment = {
                            speaker: username || "Me",
                            text: speechText,
                            timestamp: timestamp
                        };
                        
                        if (socketRef.current) {
                            socketRef.current.emit('new-transcript-segment', segment);
                        }
                        
                        setTranscripts(prev => [...prev, segment]);
                    }
                }
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
        };

        recognition.onend = () => {
            if (!askForUsername && audio) {
                try {
                    recognition.start();
                } catch (err) {
                    console.error("Failed to restart speech recognition:", err);
                }
            }
        };

        try {
            recognition.start();
        } catch (err) {
            console.error("Speech recognition start error:", err);
        }

        return () => {
            recognition.onend = null;
            try {
                recognition.stop();
            } catch (err) {
                console.error("Failed to stop speech recognition:", err);
            }
        };
    }, [askForUsername, username, audio]);

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
                    if(localVideoref.current) localVideoref.current.srcObject = null;
                }
            }
        }
    }, [video, audio, askForUsername]);

    const getPermissions = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: video, audio: audio });
            window.localStream = stream;
            if(localVideoref.current) localVideoref.current.srcObject = stream;
        } catch (e) {
            console.error("Error getting permissions", e);
            setVideo(false);
            setAudio(false);
        }
    }

    // --- MEETING MEDIA ATTACH LOGIC ---
    useEffect(() => {
        if (!askForUsername && localVideoref.current && window.localStream) {
            localVideoref.current.srcObject = window.localStream;
            
            if (!screen) {
                window.localStream.getAudioTracks().forEach(track => {
                    if(!track.isDummy) track.enabled = audio;
                });
                window.localStream.getVideoTracks().forEach(track => {
                    if(!track.isDummy) track.enabled = video;
                });
            }
        }
    }, [video, audio, screen, askForUsername]); 

    // --- DUMMY TRACKS ---
    const getSilentAudioTrack = () => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        oscillator.connect(dst);
        oscillator.start();
        const track = dst.stream.getAudioTracks()[0];
        track.enabled = false;
        track.isDummy = true;
        return track;
    }

    const getBlackVideoTrack = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        canvas.getContext('2d').fillRect(0, 0, 640, 480);
        const stream = canvas.captureStream(30);
        const track = stream.getVideoTracks()[0];
        track.enabled = false;
        track.isDummy = true;
        return track;
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
                    ? window.localStream.getVideoTracks()[0] 
                    : window.localStream.getAudioTracks()[0];
                
                if (oldTrack) {
                    window.localStream.removeTrack(oldTrack);
                    oldTrack.stop();
                }
                window.localStream.addTrack(newTrack);

                for (let id in connectionsRef.current) {
                    const sender = connectionsRef.current[id].getSenders().find(s => s.track && s.track.kind === type);
                    if (sender) sender.replaceTrack(newTrack);
                    else connectionsRef.current[id].addTrack(newTrack, window.localStream);
                }

                if(localVideoref.current) localVideoref.current.srcObject = window.localStream;
                if(isVideo) setVideo(true); else setAudio(true);
                
                if(socketRef.current) socketRef.current.emit(isVideo ? 'video-toggle' : 'audio-toggle', true);

            } else {
                const dummyTrack = isVideo ? getBlackVideoTrack() : getSilentAudioTrack();
                const oldTrack = isVideo 
                    ? window.localStream.getVideoTracks()[0] 
                    : window.localStream.getAudioTracks()[0];

                if (oldTrack) {
                    window.localStream.removeTrack(oldTrack);
                    oldTrack.stop();
                }
                window.localStream.addTrack(dummyTrack);

                for (let id in connectionsRef.current) {
                    const sender = connectionsRef.current[id].getSenders().find(s => s.track && s.track.kind === type);
                    if (sender) sender.replaceTrack(dummyTrack);
                }

                if(localVideoref.current) localVideoref.current.srcObject = window.localStream;
                if(isVideo) setVideo(false); else setAudio(false);
                
                if(socketRef.current) socketRef.current.emit(isVideo ? 'video-toggle' : 'audio-toggle', false);
            }

        } catch (e) { console.error("Error updating media:", e); }
    }

    // --- SCREEN SHARE LOGIC (FIXED) ---
    const getDislayMedia = () => {
        if (navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                .then(getDislayMediaSuccess)
                .catch((e) => { console.log(e); setScreen(false); })
        }
    }

    const getDislayMediaSuccess = (stream) => {
        try {
            const screenTrack = stream.getVideoTracks()[0];
            
            // 1. Stop current local video tracks (Camera/Dummy)
            window.localStream.getVideoTracks().forEach(track => {
                track.stop();
                window.localStream.removeTrack(track);
            });

            // 2. Add Screen Track to Local Stream
            window.localStream.addTrack(screenTrack);
            
            // 3. Update Local Preview
            localVideoref.current.srcObject = window.localStream;

            // 4. Update Remote Peers
            for (let id in connectionsRef.current) {
                if (id === socketIdRef.current) continue;
                // Safety check: ensure track exists before checking kind
                const sender = connectionsRef.current[id].getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(screenTrack);
                } else {
                    // Fallback if sender wasn't found (rare)
                    connectionsRef.current[id].addTrack(screenTrack, window.localStream);
                }
            }

            // 5. Handle "Stop Sharing" (Revert to Camera)
            screenTrack.onended = async () => {
                setScreen(false);
                try {
                    const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    const cameraTrack = cameraStream.getVideoTracks()[0];
                    
                    // Replace Screen Track with Camera Track
                    window.localStream.removeTrack(screenTrack);
                    window.localStream.addTrack(cameraTrack);
                    localVideoref.current.srcObject = window.localStream;

                    for (let id in connectionsRef.current) {
                        if (id === socketIdRef.current) continue;
                        const sender = connectionsRef.current[id].getSenders().find(s => s.track && s.track.kind === 'video');
                        if (sender) sender.replaceTrack(cameraTrack);
                    }

                    // Ensure state reflects Camera ON
                    setVideo(true);
                    if(socketRef.current) socketRef.current.emit('video-toggle', true);

                } catch (err) {
                    console.log("Error reverting to camera:", err);
                    setVideo(false);
                    if(socketRef.current) socketRef.current.emit('video-toggle', false);
                }
            };
        } catch (e) { console.log(e); }
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

    const handleEndCall = async () => {
        const endTime = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
        
        const token = localStorage.getItem("token");
        if (token) {
            try {
                // --- DEBUG LOG ---
                console.log("ATTEMPTING TO SAVE HISTORY...");

                const response = await axios.post(`${server_url}/api/v1/users/add_to_activity`, {
                    meeting_code: window.location.pathname.split('/').pop(),
                    startTime: formatter.format(startTimeRef.current),
                    endTime: formatter.format(endTime)
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                // --- SUCCESS CONFIRMATION ---
                console.log("HISTORY SAVED! Server Responded:", response.data);
                // alert("Meeting saved to History!"); // Uncomment if you want a popup verification

            } catch (e) {
                console.error("Error saving history:", e);
                alert("Failed to save history: " + e.message);
            }
        } else {
            console.log("No token found. Skipping history save for guest session.");
        }

        try { 
            let tracks = localVideoref.current.srcObject.getTracks(); 
            tracks.forEach(track => track.stop()) 
        } catch (e) { }
        
        window.location.href = "/home";
    }

    const connect = async () => {
        setAskForUsername(false);
        
        if(!window.localStream) {
             window.localStream = new MediaStream();
        }

        if(video === false) {
            const dummyVideo = getBlackVideoTrack();
            if(window.localStream.getVideoTracks().length > 0) {
                window.localStream.removeTrack(window.localStream.getVideoTracks()[0]);
            }
            window.localStream.addTrack(dummyVideo);
        }

        if(audio === false) {
            const dummyAudio = getSilentAudioTrack();
            if(window.localStream.getAudioTracks().length > 0) {
                window.localStream.removeTrack(window.localStream.getAudioTracks()[0]);
            }
            window.localStream.addTrack(dummyAudio);
        }

        // Force MyCam to show stream
        setTimeout(() => {
            if(localVideoref.current) {
                localVideoref.current.srcObject = window.localStream;
            }
        }, 100);

        socketRef.current = io.connect(server_url, { secure: false });
        socketRef.current.on('connect', () => {
            socketIdRef.current = socketRef.current.id;
            const token = localStorage.getItem("token");
            socketRef.current.emit('join-call', window.location.href, token);
        });

        socketRef.current.on('signal', handleSignal);
        socketRef.current.on('video-toggle', (fromId, isEnabled) => setVideos(prev => prev.map(v => v.socketId === fromId ? { ...v, videoEnabled: isEnabled } : v)));
        socketRef.current.on('audio-toggle', (fromId, isEnabled) => setVideos(prev => prev.map(v => v.socketId === fromId ? { ...v, audioEnabled: isEnabled } : v)));
        socketRef.current.on('chat-message', addMessage);
        socketRef.current.on('new-transcript-segment', (segment) => {
            setTranscripts(prev => [...prev, segment]);
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
            clients.forEach((socketListId) => {
                if (socketListId === socketIdRef.current) return;
                if (connectionsRef.current[socketListId]) return;

                connectionsRef.current[socketListId] = new RTCPeerConnection(peerConfigConnections);
                window.localStream.getTracks().forEach(track => connectionsRef.current[socketListId].addTrack(track, window.localStream));
                connectionsRef.current[socketListId].onicecandidate = (event) => {
                    if (event.candidate != null) socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }));
                }
                connectionsRef.current[socketListId].ontrack = (event) => {
                    const stream = event.streams[0];
                    setVideos(prev => {
                        const exists = prev.find(v => v.socketId === socketListId);
                        if(exists) return prev;
                        return [...prev, {
                            socketId: socketListId,
                            stream: stream,
                            username: usernameMapRef.current[socketListId] || "Participant",
                            videoEnabled: true,
                            audioEnabled: true
                        }];
                    });
                };

                if (id === socketIdRef.current) {
                    connectionsRef.current[socketListId].createOffer().then((description) => {
                        connectionsRef.current[socketListId].setLocalDescription(description).then(() => {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 
                                'sdp': connectionsRef.current[socketListId].localDescription,
                                'username': username,
                                'videoEnabled': video,
                                'audioEnabled': audio
                            }));
                        }).catch(e => console.log(e));
                    }).catch(e => console.log(e));
                }
            });
        });
    }

    const handleSignal = async (fromId, message) => {
        const signal = JSON.parse(message);
        if (fromId === socketIdRef.current) return;
        if (signal.sdp) {
            await connectionsRef.current[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp));
            
            if (pendingICEQueue.current[fromId]) {
                while (pendingICEQueue.current[fromId].length > 0) {
                    const candidate = pendingICEQueue.current[fromId].shift();
                    await connectionsRef.current[fromId].addIceCandidate(candidate).catch(e => console.log(e));
                }
                delete pendingICEQueue.current[fromId];
            }

            if (signal.sdp.type === 'offer') {
                const description = await connectionsRef.current[fromId].createAnswer();
                await connectionsRef.current[fromId].setLocalDescription(description);
                socketRef.current.emit('signal', fromId, JSON.stringify({ 
                    'sdp': connectionsRef.current[fromId].localDescription,
                    'username': username,
                    'videoEnabled': video,
                    'audioEnabled': audio
                }));
            }
        }
        if (signal.ice) {
            const candidate = new RTCIceCandidate(signal.ice);
            if (connectionsRef.current[fromId] && connectionsRef.current[fromId].remoteDescription) {
                await connectionsRef.current[fromId].addIceCandidate(candidate).catch(e => console.log(e));
            } else {
                if (!pendingICEQueue.current[fromId]) {
                    pendingICEQueue.current[fromId] = [];
                }
                pendingICEQueue.current[fromId].push(candidate);
            }
        }
        if(signal.username) {
            usernameMapRef.current[fromId] = signal.username;
            setVideos(prev => prev.map(v => v.socketId === fromId ? { 
                ...v, 
                username: signal.username,
                videoEnabled: signal.videoEnabled,
                audioEnabled: signal.audioEnabled
            } : v));
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

    return (
        <div>
            {askForUsername ? (
                <div className={styles.lobbyContainer}>
                    <div className={styles.lobbyCard}>
                        <h2>Enter Meeting Lobby</h2>
                        <div className={styles.lobbyVideoContainer}>
                            <video className={styles.lobbyVideoPreview} ref={localVideoref} autoPlay muted style={{ display: video ? 'block' : 'none' }}></video>
                            {!video && (
                                <div className={styles.videoOffPlaceholder}>
                                    <AccountCircleIcon className={styles.videoOffIcon} />
                                    <p className={styles.videoOffText}>Camera is Off</p>
                                </div>
                            )}
                        </div>
                        <div className={styles.lobbyControls}>
                            <IconButton onClick={() => updateMediaTrack('video')} className={video ? styles.iconBlockActive : styles.iconBlock}>
                                {video ? <VideocamIcon /> : <VideocamOffIcon />}
                            </IconButton>
                            <IconButton onClick={() => updateMediaTrack('audio')} className={audio ? styles.iconBlockActive : styles.iconBlock}>
                                {audio ? <MicIcon /> : <MicOffIcon />}
                            </IconButton>
                        </div>
                        <TextField className={styles.textFieldOverride} label="Enter Your Name" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
                        <Button variant="contained" onClick={connect} disabled={!username} sx={{ backgroundColor: '#EB5545', '&:hover': { backgroundColor: '#ff3b2f' }, marginTop: '10px' }}>
                            Join Meeting
                        </Button>
                    </div>
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>
                    <div className={styles.mainStage}>
                        {/* Top Left Info */}
                        <div className={styles.topLeftActions}>
                            <IconButton onClick={() => setShowMeetingInfo(!showMeetingInfo)} style={{ color: 'white' }}>
                                <InfoIcon />
                            </IconButton>
                        </div>

                        {showMeetingInfo && (
                            <div className={styles.meetingInfoCard}>
                                <div className={styles.meetingInfoHeader}>
                                    <h3>Meeting Details</h3>
                                    <IconButton size="small" onClick={() => setShowMeetingInfo(false)} style={{color: 'white'}}><CloseIcon fontSize="small"/></IconButton>
                                </div>
                                <div className={styles.infoSection}>
                                    <span className={styles.infoLabel}>Joining Info</span>
                                    <div className={styles.linkBox}>
                                        <span className={styles.linkText}>{window.location.href}</span>
                                        <IconButton size="small" onClick={handleCopyLink} style={{color: '#EB5545'}}><ContentCopyIcon fontSize="small"/></IconButton>
                                    </div>
                                    {copySuccess && <p className={styles.copySuccess}>Link copied!</p>}
                                </div>
                            </div>
                        )}

                        {/* REMOTE VIDEOS GRID */}
                        <div className={styles.conferenceView}>
                            {videos.map((videoObj) => (
                                <div key={videoObj.socketId} className={styles.remoteVideoContainer}>
                                     <div className={styles.userInfoOverlay}>
                                        <AccountCircleIcon fontSize="small" style={{color:'white'}} />
                                        <span className={styles.usernameText}>{videoObj.username || "Participant"}</span> 
                                    </div>

                                    <div className={styles.micStatusOverlay}>
                                        {videoObj.audioEnabled !== false ? 
                                            <MicIcon fontSize="small" style={{color: 'white'}} /> : 
                                            <MicOffIcon fontSize="small" style={{color: '#EB5545'}} />
                                        }
                                    </div>

                                    <video
                                        className={styles.remoteVideo}
                                        ref={ref => {
                                            if (ref && videoObj.stream) {
                                                if(ref.srcObject !== videoObj.stream) ref.srcObject = videoObj.stream;
                                            }
                                        }}
                                        autoPlay
                                        playsInline
                                        style={{ display: videoObj.videoEnabled !== false ? 'block' : 'none' }}
                                    >
                                    </video>
                                    
                                    <div className={styles.videoOffPlaceholder} style={{ display: videoObj.videoEnabled !== false ? 'none' : 'flex' }}>
                                        <AccountCircleIcon className={styles.videoOffIcon} />
                                        <p className={styles.videoOffText}>Camera Off</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* LOCAL VIDEO (PIP) */}
                        <div className={styles.localVideoContainer}>
                             <div className={styles.userInfoOverlay}>
                                <span className={styles.usernameText}>{username} (You)</span>
                            </div>
                            
                            <div className={styles.micStatusOverlay}>
                                {audio ? <MicIcon fontSize="small" style={{color: 'white'}} /> : <MicOffIcon fontSize="small" style={{color: '#EB5545'}} />}
                            </div>

                            <video className={styles.localVideo} ref={localVideoref} autoPlay muted style={{ display: video ? 'block' : 'none' }}></video>
                            {!video && (
                                <div className={styles.videoOffPlaceholder}>
                                    <AccountCircleIcon className={styles.videoOffIcon} />
                                </div>
                            )}
                        </div>

                        {/* CONTROLS */}
                        <div className={styles.meetingInfoContainer}>
                            <span className={styles.timeText}>{formatTime(currentTime)}</span>
                            <span className={styles.meetingCodeText}>{window.location.pathname.split('/').pop() || "MEETING"}</span>
                        </div>

                        <div className={styles.buttonContainers}>
                            <IconButton onClick={() => updateMediaTrack('video')} className={video ? styles.iconBlockActive : styles.iconBlock}>
                                {video ? <VideocamIcon /> : <VideocamOffIcon />}
                            </IconButton>
                            <IconButton onClick={() => updateMediaTrack('audio')} className={audio ? styles.iconBlockActive : styles.iconBlock}>
                                {audio ? <MicIcon /> : <MicOffIcon />}
                            </IconButton>
                            {screenAvailable && (
                                <IconButton onClick={handleScreen} className={screen ? styles.iconBlock : styles.iconBlockActive}>
                                    {screen ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                                </IconButton>
                            )}
                            <Badge badgeContent={newMessages} color="error">
                                <IconButton onClick={toggleChat} className={styles.iconBlock}>
                                    <ChatIcon />
                                </IconButton>
                            </Badge>
                            <IconButton onClick={toggleParticipants} className={styles.iconBlock}>
                                <PeopleIcon />
                            </IconButton>
                            <IconButton onClick={toggleTranscript} className={showTranscript ? styles.iconBlockActive : styles.iconBlock}>
                                <ClosedCaptionIcon />
                            </IconButton>
                            <IconButton onClick={handleEndCall} className={styles.iconBlockEnd}>
                                <CallEndIcon />
                            </IconButton>
                        </div>
                    </div>

                    {/* RESIZER & SIDEBAR CONTAINER */}
                    {(showParticipants || showModal || showTranscript) && (
                        <>
                            <div className={styles.resizer} onMouseDown={handleMouseDown} />
                            <div className={styles.sideBarContainer} style={{ width: `${sidebarWidth}px` }}>
                                <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.1)', padding: '5px' }}>
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
                                        indicatorColor="primary"
                                        variant="fullWidth"
                                        sx={{
                                            '& .MuiTab-root': { color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', textTransform: 'none', minHeight: '40px' },
                                            '& .Mui-selected': { color: '#EB5545 !important', fontWeight: 'bold' },
                                            '& .MuiTabs-indicator': { backgroundColor: '#EB5545' }
                                        }}
                                    >
                                        <Tab label={`Chat${newMessages > 0 ? ` (${newMessages})` : ''}`} />
                                        <Tab label="Participants" />
                                        <Tab label="Transcript" />
                                    </Tabs>
                                </Box>

                                {/* Participants List */}
                                {showParticipants && (
                                    <div className={styles.sideBar}>
                                        <div className={styles.sideBarHeader}>
                                            <h3>Participants ({videos.length + 1})</h3>
                                            <IconButton size="small" onClick={() => setShowParticipants(false)} style={{color: 'white'}}><CloseIcon fontSize="small" /></IconButton>
                                        </div>
                                        <div style={{overflowY: 'auto', flex: 1}}>
                                            <div className={styles.participantItem}>
                                                <div className={styles.participantInfo}>
                                                    <div className={styles.participantAvatar}>{username.charAt(0).toUpperCase()}</div>
                                                    <span>{username} (You)</span>
                                                </div>
                                                {!audio && <MicOffIcon fontSize="small" style={{color: '#EB5545'}} />}
                                            </div>
                                            {videos.map((v) => (
                                                <div key={v.socketId} className={styles.participantItem}>
                                                    <div className={styles.participantInfo}>
                                                        <div className={styles.participantAvatar}>{v.username?.charAt(0).toUpperCase()}</div>
                                                        <span>{v.username}</span>
                                                    </div>
                                                    {v.audioEnabled === false && <MicOffIcon fontSize="small" style={{color: '#EB5545'}} />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Chat Sidebar */}
                                {showModal && (
                                    <div className={styles.sideBar}>
                                        <div className={styles.sideBarHeader}>
                                            <h1>Chat Room</h1>
                                            <IconButton onClick={() => setModal(false)} style={{ color: "white" }}><CloseIcon /></IconButton>
                                        </div>
                                        <div className={styles.chattingDisplay}>
                                            {messages.map((item, index) => (
                                                <div key={index} className={`${styles.chatBubble} ${item.sender === username ? styles.msgLocal : styles.msgRemote}`}>
                                                    <span className={styles.senderName}>{item.sender}</span>{item.data}
                                                </div>
                                            ))}
                                        </div>
                                        <div className={styles.chattingArea}>
                                            <TextField className={styles.textFieldOverride} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." variant="outlined" size="small" />
                                            <Button variant='contained' onClick={sendMessage} sx={{ backgroundColor: '#EB5545', minWidth: '80px' }}>Send</Button>
                                        </div>
                                    </div>
                                )}

                                {/* Transcript Panel */}
                                {showTranscript && (
                                    <div className={styles.sideBar}>
                                        <div className={styles.sideBarHeader}>
                                            <h3>Live Transcript</h3>
                                            <IconButton size="small" onClick={() => setShowTranscript(false)} style={{color: 'white'}}><CloseIcon fontSize="small" /></IconButton>
                                        </div>
                                        <div style={{ overflowY: 'auto', flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {transcripts.length === 0 ? (
                                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>
                                                    No transcript segments yet. Start speaking to see text here.
                                                </div>
                                            ) : (
                                                transcripts.map((t, index) => (
                                                    <div key={index} style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: '12px', borderLeft: '3px solid #EB5545' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#EB5545', textTransform: 'capitalize' }}>
                                                                {t.speaker}
                                                            </span>
                                                            <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginLeft: 'auto' }}>
                                                                {t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                            </span>
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'white', lineHeight: '1.4', wordBreak: 'break-word' }}>{t.text}</p>
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
        </div>
    )
}