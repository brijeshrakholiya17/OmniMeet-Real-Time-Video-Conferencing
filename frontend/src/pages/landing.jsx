import React, { useContext, useState, useEffect } from 'react';
import "../App.css";
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar, Alert } from '@mui/material';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import SensorsIcon from '@mui/icons-material/Sensors';

export default function LandingPage() {
    const router = useNavigate();
    const { userData, handleLogout } = useContext(AuthContext);

    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // --- TYPEWRITER STATE ---
    const [typedText, setTypedText] = useState("");
    const targetText = "Instant, crystal-clear video collaboration for modern teams.";

    // --- AUTO-REDIRECT FOR AUTHENTICATED USERS ---
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (userData || token) {
            router('/home', { replace: true });
        }
    }, [userData, router]);

    const generateRoomCode = () => {
        const chars = "abcdefghijklmnopqrstuvwxyz";
        const segment = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        return `${segment(3)}-${segment(4)}-${segment(3)}`;
    };

    // --- TYPEWRITER LOGIC ---
    useEffect(() => {
        let index = 0;
        const typingInterval = setInterval(() => {
            if (index <= targetText.length) {
                setTypedText(targetText.slice(0, index));
                index++;
            } else {
                clearInterval(typingInterval);
            }
        }, 40);

        return () => clearInterval(typingInterval);
    }, []);

    const logoutUser = () => {
        handleLogout(); 
        setMessage("Logged out successfully"); 
        setOpen(true); 
    };

    return (
        <div className='landingPageContainer lightTheme'>
            {/* Ambient Background Atmosphere */}
            <div className="landingGlow glowTopLeft"></div>
            <div className="landingGlow glowBottomRight"></div>
            <div className="landingGlow glowCenter"></div>
            <div className="landingGridOverlay"></div>

            {/* Top Navigation Bar */}
            <nav className="landingNavBar">
                <div className='brandWrapper' onClick={() => router('/')}>
                    <div className="brandLogoIcon">
                        <VideoCallIcon className="logoSvg" />
                    </div>
                    <div className="brandLogoTitles">
                        <h2 className="brandLogoText">OmniMeet</h2>
                        <span className="brandSubBadge">ENTERPRISE MESH</span>
                    </div>
                </div>

                {/* Desktop Nav Actions */}
                <div className='navlist desktopNav'>
                    {!userData ? (
                        <>
                            <button 
                                className='guestBtn' 
                                onClick={() => {
                                    const roomId = generateRoomCode();
                                    router(`/${roomId}`);
                                }}
                            >
                                <SensorsIcon className="guestIcon" />
                                <span>Join as Guest</span>
                            </button>
                            <button 
                                className='authBtn' 
                                onClick={() => router("/auth", { state: { formState: 1 } })}
                            >
                                Register
                            </button>
                            <button 
                                className='authBtn loginBtn' 
                                onClick={() => router("/auth", { state: { formState: 0 } })}
                            >
                                Sign In
                            </button>
                        </>
                    ) : (
                        <>
                            <button className='authBtn' onClick={() => router('/home')}>
                                Dashboard
                            </button>
                            <button className='authBtn loginBtn' onClick={logoutUser}>
                                Logout
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <div className="mobileMenuToggle">
                    <button 
                        className="mobileMenuBtn" 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle Navigation Menu"
                    >
                        {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                    </button>
                </div>
            </nav>

            {/* Mobile Slide-Over Drawer */}
            {isMobileMenuOpen && (
                <>
                    <div className="landingDrawerBackdrop" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <div className="landingDrawer">
                        <div className="drawerTop">
                            <div className="drawerBrand">
                                <VideoCallIcon className="drawerIcon" />
                                <span>OmniMeet</span>
                            </div>
                            <button className="drawerClose" onClick={() => setIsMobileMenuOpen(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="drawerButtons">
                            {!userData ? (
                                <>
                                    <button 
                                        className="drawerBtn primary"
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            const roomId = generateRoomCode();
                                            router(`/${roomId}`);
                                        }}
                                    >
                                        <SensorsIcon /> Join as Guest
                                    </button>
                                    <button 
                                        className="drawerBtn"
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            router("/auth", { state: { formState: 0 } });
                                        }}
                                    >
                                        Sign In
                                    </button>
                                    <button 
                                        className="drawerBtn highlight"
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            router("/auth", { state: { formState: 1 } });
                                        }}
                                    >
                                        Create Free Account
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        className="drawerBtn primary"
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            router('/home');
                                        }}
                                    >
                                        Go to Dashboard
                                    </button>
                                    <button 
                                        className="drawerBtn"
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            logoutUser();
                                        }}
                                    >
                                        Log Out
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Hero Section */}
            <main className="landingMainContainer">
                <section className="textSection">
                    <div className="heroPill">
                        <AutoAwesomeIcon className="sparkleSvg" />
                        <span>Next-Gen WebRTC Peer-to-Peer Mesh</span>
                    </div>

                    <h1 className="landingHeadline">
                        Connect with <br />
                        <span className="gradientHeadline">Infinite Clarity.</span>
                    </h1>
                    
                    <p className='typingText'>{typedText || "Instant, crystal-clear video collaboration for modern teams."}</p>
                    
                    <div className="ctaButtonGroup">
                        <Link 
                            to={userData ? "/home" : "/auth"} 
                            className="primaryCtaBtn"
                        >
                            <span>Get Started Free</span>
                            <ArrowForwardIcon className="arrowSvg" />
                        </Link>

                        <button 
                            className="guestLaunchBtn"
                            onClick={() => {
                                const roomId = generateRoomCode();
                                router(`/${roomId}`);
                            }}
                        >
                            <SensorsIcon className="guestSvg" />
                            <span>Try Instant Call</span>
                        </button>
                    </div>

                    {/* Trust Badges */}
                    <div className="landingSpecsRow">
                        <div className="specBadge">
                            <SpeedIcon className="badgeIcon" />
                            <span>&lt;15ms Latency</span>
                        </div>
                        <div className="specDot"></div>
                        <div className="specBadge">
                            <SecurityIcon className="badgeIcon" />
                            <span>End-to-End Encrypted</span>
                        </div>
                        <div className="specDot"></div>
                        <div className="specBadge">
                            <GraphicEqIcon className="badgeIcon" />
                            <span>48kHz HD Audio</span>
                        </div>
                    </div>
                </section>
                
                {/* Right Interactive Mockup Stage */}
                <section className="imageSection">
                    <div className="deviceMockupCard">
                        <div className="mockupHeader">
                            <div className="headerDots">
                                <span className="dot red"></span>
                                <span className="dot yellow"></span>
                                <span className="dot green"></span>
                            </div>
                            <div className="mockupStatusPill">
                                <span className="pulseRadar"></span>
                                <span>LIVE 4K ULTRA-HD</span>
                            </div>
                        </div>

                        <div className="mockupChamber">
                            <img src="/mobile.png" alt="OmniMeet Mobile Video Experience" className="mockupImage" />
                            <div className="floatingCallCard cardTop">
                                <div className="cardAvatar">O</div>
                                <div className="cardInfo">
                                    <strong>OmniMeet Studio</strong>
                                    <span>Spatial Audio Active</span>
                                </div>
                            </div>
                            <div className="floatingCallCard cardBottom">
                                <span className="dotGreen"></span>
                                <span>Encrypted Peer Mesh • 60 FPS</span>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Notification Snackbar */}
            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert onClose={() => setOpen(false)} severity="success" sx={{ width: '100%' }}>
                    {message}
                </Alert>
            </Snackbar>
        </div>
    );
}