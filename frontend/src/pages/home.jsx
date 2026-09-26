import React, { useContext, useState, useEffect } from 'react';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import "../styles/HomeComponent.css"; 
import { 
    Button, 
    IconButton, 
    TextField, 
    Avatar, 
    Menu, 
    MenuItem, 
    Box, 
    Typography,
    Tooltip,
    Fade
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SensorsIcon from '@mui/icons-material/Sensors';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import SparklesIcon from '@mui/icons-material/AutoFixHigh';
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {
    const navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [profileAnchorEl, setProfileAnchorEl] = useState(null);
    const isProfileMenuOpen = Boolean(profileAnchorEl);

    // Interactive Preview Equipment States
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);
    const [copySuccess, setCopySuccess] = useState(false);
    const [currentTime, setCurrentTime] = useState("");
    const [greeting, setGreeting] = useState("Welcome back");

    const { handleLogout, userData } = useContext(AuthContext);

    // Real-time Clock & Dynamic Greeting
    useEffect(() => {
        const updateTimeAndGreeting = () => {
            const now = new Date();
            const hours = now.getHours();
            
            if (hours < 12) setGreeting("Good morning");
            else if (hours < 18) setGreeting("Good afternoon");
            else setGreeting("Good evening");

            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setCurrentTime(timeStr);
        };

        updateTimeAndGreeting();
        const interval = setInterval(updateTimeAndGreeting, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleProfileClick = (event) => {
        setProfileAnchorEl(event.currentTarget);
    };

    const handleProfileClose = () => {
        setProfileAnchorEl(null);
    };

    const handleJoinVideoCall = (codeToJoin) => {
        const targetCode = typeof codeToJoin === 'string' ? codeToJoin : meetingCode;
        if (!targetCode || targetCode.trim() === "") return;
        
        // Clean room code from full URLs if pasted directly
        const cleanCode = targetCode.trim().replace(/^https?:\/\/[^/]+\//, '').replace(/\s+/g, '-');
        navigate(`/${cleanCode}`);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleJoinVideoCall();
        }
    };

    // Instant Room Generation
    const generateRandomCode = () => {
        const adjectives = ['swift', 'hyper', 'quantum', 'prime', 'nexus', 'sonic', 'stellar', 'vivid', 'crystal', 'aero'];
        const nouns = ['pulse', 'matrix', 'space', 'node', 'stream', 'flow', 'orbit', 'core', 'lounge', 'hub'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNum = Math.floor(100 + Math.random() * 900);
        return `${randomAdj}-${randomNoun}-${randomNum}`;
    };

    const handleStartInstantMeeting = () => {
        const newCode = generateRandomCode();
        navigate(`/${newCode}`);
    };

    const handleGenerateToInput = () => {
        const newCode = generateRandomCode();
        setMeetingCode(newCode);
    };

    const handlePasteClipboard = async () => {
        try {
            if (navigator.clipboard) {
                const text = await navigator.clipboard.readText();
                if (text) {
                    const cleanCode = text.trim().replace(/^https?:\/\/[^/]+\//, '');
                    setMeetingCode(cleanCode);
                }
            }
        } catch (err) {
            console.warn("Clipboard access denied or not supported", err);
        }
    };

    const handleCopyCode = () => {
        if (!meetingCode) return;
        navigator.clipboard.writeText(meetingCode);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const toggleMenu = (e) => {
        if (e) e.stopPropagation();
        setIsMenuOpen(prev => !prev);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    const firstLetter = (userData?.username || "U").charAt(0).toUpperCase();

    return (
        <div className="homeContainer lightTheme">
            {/* Ambient Pastel Glow Mesh */}
            <div className="ambientGlow glowCoral"></div>
            <div className="ambientGlow glowSky"></div>
            <div className="ambientGlow glowIris"></div>
            <div className="lightPatternGrid"></div>

            {/* Top Navigation Bar */}
            <header className="navBar">
                <div className="brandWrapper" onClick={() => navigate('/home')}>
                    <div className="brandIconPod">
                        <VideoCallIcon className="brandSvg" />
                    </div>
                    <div className="brandTitles">
                        <h2 className="logoText">OmniMeet</h2>
                        <span className="brandTagline">STUDIO SUITE</span>
                    </div>
                    <span className="versionPill">v2.4 Pro</span>
                </div>

                {/* Center Real-Time Indicators (Desktop) */}
                <div className="navCenter desktopOnly">
                    <div className="meshStatusPill">
                        <span className="liveRadarDot"></span>
                        <SensorsIcon className="meshIcon" />
                        <span>Mesh Network Ready</span>
                    </div>
                    <div className="clockPill">
                        <AccessTimeIcon className="clockIcon" />
                        <span>{currentTime || '00:00:00'}</span>
                    </div>
                </div>

                {/* Right Desktop Nav */}
                <div className="navRight desktopNav">
                    <button className="historyNavBtn" onClick={() => navigate("/history")}>
                        <RestoreIcon className="historyIcon" />
                        <span>History & Logs</span>
                    </button>

                    {userData && (
                        <div className="userProfilePill">
                            <IconButton onClick={handleProfileClick} className="avatarBtn" sx={{ p: 0 }}>
                                <Avatar className="userAvatar">
                                    {firstLetter}
                                </Avatar>
                            </IconButton>

                            <Menu
                                anchorEl={profileAnchorEl}
                                open={isProfileMenuOpen}
                                onClose={handleProfileClose}
                                TransitionComponent={Fade}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                className="profileMenu"
                                sx={{
                                    '& .MuiPaper-root': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(226, 232, 240, 0.9)',
                                        borderRadius: '20px',
                                        minWidth: '240px',
                                        marginTop: '10px',
                                        boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                                        overflow: 'hidden',
                                        color: '#0f172a'
                                    }
                                }}
                            >
                                <Box className="profileMenuHeader">
                                    <span className="profileMenuLabel">Active Session</span>
                                    <div className="profileUserRow">
                                        <div className="onlineStatusDot"></div>
                                        <Typography className="profileMenuUsername">
                                            {userData.username}
                                        </Typography>
                                    </div>
                                    <span className="profileUserEmail">P2P Mesh Verified</span>
                                </Box>

                                <MenuItem 
                                    onClick={() => { handleProfileClose(); navigate("/history"); }}
                                    className="profileMenuItem"
                                >
                                    <RestoreIcon fontSize="small" className="menuItemIcon" />
                                    <span>Conference History</span>
                                </MenuItem>

                                <MenuItem 
                                    onClick={() => { handleProfileClose(); handleLogout(); }} 
                                    className="profileMenuItem logoutItem"
                                >
                                    <LogoutIcon fontSize="small" className="logoutSvg" />
                                    <span>Sign Out & Disconnect</span>
                                </MenuItem>
                            </Menu>
                        </div>
                    )}
                </div>

                {/* Mobile Menu Icon */}
                <div className="mobileMenuIconWrapper">
                    <button 
                        type="button" 
                        onClick={toggleMenu} 
                        className="mobileMenuButton" 
                        aria-label="Toggle Navigation Menu"
                    >
                        {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
                    </button>
                </div>
            </header>

            {/* Mobile Slide-Over Drawer & Backdrop */}
            {isMenuOpen && (
                <>
                    <div className="mobileDrawerBackdrop" onClick={closeMenu}></div>
                    <div className="mobileDrawerPanel">
                        <div className="drawerHeader">
                            <div className="drawerBrand">
                                <VideoCallIcon className="drawerBrandIcon" />
                                <span>OmniMeet</span>
                            </div>
                            <button className="drawerCloseBtn" onClick={closeMenu} aria-label="Close menu">
                                <CloseIcon />
                            </button>
                        </div>

                        {userData && (
                            <div className="drawerUserCard">
                                <Avatar className="drawerAvatar">
                                    {firstLetter}
                                </Avatar>
                                <div className="drawerUserInfo">
                                    <span className="drawerUsername">{userData.username}</span>
                                    <span className="drawerUserStatus">
                                        <span className="dotGreen"></span> Online • Mesh Ready
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="drawerNavList">
                            <button 
                                className="drawerNavItem" 
                                onClick={() => { closeMenu(); handleStartInstantMeeting(); }}
                            >
                                <AutoAwesomeIcon className="itemIcon coral" />
                                <span>Start Instant Meeting</span>
                            </button>

                            <button 
                                className="drawerNavItem" 
                                onClick={() => { closeMenu(); navigate("/history"); }}
                            >
                                <RestoreIcon className="itemIcon sky" />
                                <span>Meeting History</span>
                            </button>

                            <div className="drawerTimeInfo">
                                <AccessTimeIcon fontSize="small" />
                                <span>Current Time: {currentTime || '00:00'}</span>
                            </div>

                            <button 
                                className="drawerNavItem logoutNav" 
                                onClick={() => { closeMenu(); handleLogout(); }}
                            >
                                <LogoutIcon className="itemIcon red" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Main Content Workspace */}
            <main className="meetContainer">
                
                {/* Left Panel: Hero & Interactive Action Cards */}
                <section className="leftPanel">
                    
                    {/* Greeting Badge */}
                    <div className="greetingBadge">
                        <SparklesIcon className="sparkleIcon" />
                        <span className="greetingText">
                            {greeting}, <strong className="usernameBold">{userData?.username || 'Host'}</strong>
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className="heroTitle">
                        Crystal-Clear <br />
                        <span className="heroGradientText">Video Collaboration.</span>
                    </h1>

                    <p className="heroSubtitle">
                        Connect, present, and collaborate with zero-latency WebRTC peer streams, 
                        AI spatial noise suppression, and enterprise-grade end-to-end encryption.
                    </p>

                    {/* Action Hub */}
                    <div className="actionHub">
                        
                        {/* Instant Launch Card */}
                        <div className="instantActionCard">
                            <div className="actionCardLeft">
                                <div className="actionBadge instantBadge">
                                    <VideoCallIcon />
                                </div>
                                <div className="actionText">
                                    <h3>Instant Conference</h3>
                                    <p>Start a secure HD room in one click</p>
                                </div>
                            </div>
                            <Button 
                                onClick={handleStartInstantMeeting} 
                                variant="contained" 
                                className="instantLaunchBtn"
                                startIcon={<AutoAwesomeIcon />}
                            >
                                New Meeting
                            </Button>
                        </div>

                        {/* Join with Meeting Code Card */}
                        <div className="joinMeetingCard">
                            <div className="joinCardHeader">
                                <div className="actionBadge joinBadge">
                                    <SensorsIcon />
                                </div>
                                <div className="actionText">
                                    <h3>Join with Meeting Code</h3>
                                    <p>Enter an invitation code or paste direct URL</p>
                                </div>
                            </div>

                            <div className="inputRow">
                                <div className="inputFieldBox">
                                    <TextField 
                                        value={meetingCode}
                                        onChange={e => setMeetingCode(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder="e.g. quantum-pulse-402"
                                        variant="standard" 
                                        className="styledTextField"
                                        autoComplete="off"
                                        InputProps={{
                                            disableUnderline: true,
                                            endAdornment: (
                                                <div className="inputToolButtons">
                                                    {meetingCode && (
                                                        <Tooltip title={copySuccess ? "Copied!" : "Copy Code"}>
                                                            <IconButton onClick={handleCopyCode} size="small" className="toolBtn">
                                                                {copySuccess ? <CheckCircleIcon fontSize="inherit" color="success" /> : <ContentCopyIcon fontSize="inherit" />}
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip title="Paste from Clipboard">
                                                        <IconButton onClick={handlePasteClipboard} size="small" className="toolBtn">
                                                            <ContentPasteIcon fontSize="inherit" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Random Room ID">
                                                        <IconButton onClick={handleGenerateToInput} size="small" className="toolBtn">
                                                            <ShuffleIcon fontSize="inherit" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </div>
                                            )
                                        }}
                                    />
                                </div>

                                <Button 
                                    onClick={() => handleJoinVideoCall()} 
                                    variant='contained' 
                                    disabled={!meetingCode.trim()}
                                    className={`joinActionBtn ${meetingCode.trim() ? 'active' : ''}`}
                                    endIcon={<ArrowForwardIcon />}
                                >
                                    Join
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Bento Specs / Metric Highlights */}
                    <div className="bentoSpecsRow">
                        <div className="specItem">
                            <div className="specIconWrapper speed">
                                <SpeedIcon />
                            </div>
                            <div className="specInfo">
                                <span className="specValue">&lt; 15ms</span>
                                <span className="specLabel">Ultra-Low Latency</span>
                            </div>
                        </div>

                        <div className="specDivider"></div>

                        <div className="specItem">
                            <div className="specIconWrapper shield">
                                <SecurityIcon />
                            </div>
                            <div className="specInfo">
                                <span className="specValue">P2P Mesh</span>
                                <span className="specLabel">End-to-End Encrypted</span>
                            </div>
                        </div>

                        <div className="specDivider"></div>

                        <div className="specItem">
                            <div className="specIconWrapper sound">
                                <GraphicEqIcon />
                            </div>
                            <div className="specInfo">
                                <span className="specValue">48kHz Audio</span>
                                <span className="specLabel">AI Spatial Clarity</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Right Panel: Interactive Studio Display */}
                <section className='rightPanel'>
                    <div className="studioStageCard">
                        
                        {/* Live Studio Frame Header */}
                        <div className="studioHeader">
                            <div className="studioStatus">
                                <span className="statusBeacon"></span>
                                <span className="liveStatusText">OMNICORE STUDIO READY</span>
                            </div>
                            <div className="resolutionBadge">
                                4K 60FPS HDR
                            </div>
                        </div>

                        {/* Interactive Viewport Chamber */}
                        <div className="studioViewport">
                            <img 
                                src='/logo3.png' 
                                alt="OmniMeet Studio Visual" 
                                className="hologramGraphic"
                            />

                            {/* Floating Active Participant Tag */}
                            <div className="floatingHoloTag tagTopLeft">
                                <div className="participantAvatarMini">
                                    {firstLetter}
                                </div>
                                <div className="participantDetails">
                                    <span className="pName">{userData?.username || 'You (Host)'}</span>
                                    <span className="pRole">Audio / Video Master</span>
                                </div>
                                <div className="audioWaveMini">
                                    <span className="waveBar b1"></span>
                                    <span className="waveBar b2"></span>
                                    <span className="waveBar b3"></span>
                                </div>
                            </div>

                            {/* Floating Mesh Quality Tag */}
                            <div className="floatingHoloTag tagBottomRight">
                                <span className="healthDot"></span>
                                <span>Bitrate: 8.4 Mbps • Loss: 0.0%</span>
                            </div>

                            {/* Ambient Rings */}
                            <div className="orbitalRing inner"></div>
                            <div className="orbitalRing outer"></div>
                        </div>

                        {/* Interactive Preflight Equipment Dock */}
                        <div className="preflightDock">
                            <div className="dockButtons">
                                <Tooltip title={isMicOn ? "Microphone Live" : "Microphone Muted"}>
                                    <button 
                                        className={`dockToggleBtn ${isMicOn ? 'active' : 'muted'}`}
                                        onClick={() => setIsMicOn(!isMicOn)}
                                    >
                                        {isMicOn ? <MicIcon /> : <MicOffIcon />}
                                        <span>{isMicOn ? "Mic Live" : "Muted"}</span>
                                    </button>
                                </Tooltip>

                                <Tooltip title={isCamOn ? "Camera Live" : "Camera Disabled"}>
                                    <button 
                                        className={`dockToggleBtn ${isCamOn ? 'active' : 'muted'}`}
                                        onClick={() => setIsCamOn(!isCamOn)}
                                    >
                                        {isCamOn ? <VideocamIcon /> : <VideocamOffIcon />}
                                        <span>{isCamOn ? "Cam Live" : "Cam Off"}</span>
                                    </button>
                                </Tooltip>
                            </div>

                            <div className="dockDivider"></div>

                            <div className="dockVisualizer">
                                <div className="visualizerHeader">
                                    <GraphicEqIcon className="spectrumSvg" />
                                    <span>Signal Active</span>
                                </div>
                                <div className="audioSpectrumBars">
                                    <span className="specBar s1"></span>
                                    <span className="specBar s2"></span>
                                    <span className="specBar s3"></span>
                                    <span className="specBar s4"></span>
                                    <span className="specBar s5"></span>
                                    <span className="specBar s6"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default withAuth(HomeComponent);