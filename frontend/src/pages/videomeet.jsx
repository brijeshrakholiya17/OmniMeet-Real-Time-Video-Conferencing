import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button } from '@mui/material';
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
import server from '../environment';
import axios from 'axios'; 

const server_url = server;

var connections = {};

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

    const startTimeRef = useRef(new Date()); 

    const [videos, setVideos] = useState([]);

    useEffect(() => {
        if (navigator.mediaDevices.getDisplayMedia) {
            setScreenAvailable(true);
        }

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [])

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

                for (let id in connections) {
                    const sender = connections[id].getSenders().find(s => s.track && s.track.kind === type);
                    if (sender) sender.replaceTrack(newTrack);
                    else connections[id].addTrack(newTrack, window.localStream);
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

                for (let id in connections) {
                    const sender = connections[id].getSenders().find(s => s.track && s.track.kind === type);
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
            for (let id in connections) {
                if (id === socketIdRef.current) continue;
                // Safety check: ensure track exists before checking kind
                const sender = connections[id].getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(screenTrack);
                } else {
                    // Fallback if sender wasn't found (rare)
                    connections[id].addTrack(screenTrack, window.localStream);
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

                    for (let id in connections) {
                        if (id === socketIdRef.current) continue;
                        const sender = connections[id].getSenders().find(s => s.track && s.track.kind === 'video');
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
        
        try {
            await axios.post(`${server_url}/api/v1/users/add_to_history`, {
                token: localStorage.getItem("token"),
                meeting_code: window.location.pathname.split('/').pop(),
                startTime: formatter.format(startTimeRef.current),
                endTime: formatter.format(endTime)
            });
        } catch (e) {
            console.error("Error saving history:", e);
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
            socketRef.current.emit('join-call', window.location.href);
        });

        socketRef.current.on('signal', handleSignal);
        socketRef.current.on('video-toggle', (fromId, isEnabled) => setVideos(prev => prev.map(v => v.socketId === fromId ? { ...v, videoEnabled: isEnabled } : v)));
        socketRef.current.on('audio-toggle', (fromId, isEnabled) => setVideos(prev => prev.map(v => v.socketId === fromId ? { ...v, audioEnabled: isEnabled } : v)));
        socketRef.current.on('chat-message', addMessage);
        socketRef.current.on('user-left', (id) => setVideos(prev => prev.filter(v => v.socketId !== id)));

        socketRef.current.on('user-joined', (id, clients) => {
            clients.forEach((socketListId) => {
                connections[socketListId] = new RTCPeerConnection(peerConfigConnections);
                window.localStream.getTracks().forEach(track => connections[socketListId].addTrack(track, window.localStream));
                connections[socketListId].onicecandidate = (event) => {
                    if (event.candidate != null) socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }));
                }
                connections[socketListId].ontrack = (event) => {
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
                    if (socketListId === socketIdRef.current) return;
                    connections[socketListId].createOffer().then((description) => {
                        connections[socketListId].setLocalDescription(description).then(() => {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 
                                'sdp': connections[socketListId].localDescription,
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
            await connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp));
            if (signal.sdp.type === 'offer') {
                const description = await connections[fromId].createAnswer();
                await connections[fromId].setLocalDescription(description);
                socketRef.current.emit('signal', fromId, JSON.stringify({ 
                    'sdp': connections[fromId].localDescription,
                    'username': username,
                    'videoEnabled': video,
                    'audioEnabled': audio
                }));
            }
        }
        if (signal.ice) await connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
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
    const toggleChat = () => { setModal(!showModal); setShowParticipants(false); setNewMessages(0); }
    const toggleParticipants = () => { setShowParticipants(!showParticipants); setModal(false); }
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
                        <IconButton onClick={handleEndCall} className={styles.iconBlockEnd}>
                            <CallEndIcon />
                        </IconButton>
                    </div>
                </div>
            )}
        </div>
    )
}