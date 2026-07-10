import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../styles/HomeComponent.css"; 
import { Button, IconButton, TextField, Avatar, Menu, MenuItem, Box, Typography } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from '../contexts/AuthContext';
// --- NEW IMPORTS FOR MENU ---
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';

function HomeComponent() {

    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const [isMenuOpen, setIsMenuOpen] = useState(false); // State for Mobile Menu
    const [profileAnchorEl, setProfileAnchorEl] = useState(null);
    const isProfileMenuOpen = Boolean(profileAnchorEl);

    const { handleLogout, userData } = useContext(AuthContext);

    const handleProfileClick = (event) => {
        setProfileAnchorEl(event.currentTarget);
    };

    const handleProfileClose = () => {
        setProfileAnchorEl(null);
    };

    let handleJoinVideoCall = async () => {
        if(meetingCode.trim() === "") return; 
        navigate(`/${meetingCode}`)
    }

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    }

    const firstLetter = (userData?.username || "U").charAt(0).toUpperCase();

    return (
        <div className="homeContainer">
            
            {/* Navigation Bar */}
            <div className="navBar">
                <div style={{ display: "flex", alignItems: "center" }}>
                    <h2 className="logoText">OmniMeet</h2>
                </div>

                {/* --- DESKTOP NAV (Added class 'desktopNav') --- */}
                {/* This will be hidden on mobile by your CSS */}
                <div className="navRight desktopNav">
                    <div className="historyBtn" onClick={() => navigate("/history")}>
                        <IconButton className="iconBtn">
                            <RestoreIcon />
                        </IconButton>
                        <p>History</p>
                    </div>

                    {userData && (
                        <>
                            <IconButton onClick={handleProfileClick} sx={{ p: 0 }}>
                                <Avatar 
                                    sx={{ 
                                        bgcolor: '#EB5545', 
                                        color: 'white', 
                                        fontWeight: 'bold', 
                                        cursor: 'pointer',
                                        width: 40,
                                        height: 40,
                                        transition: 'transform 0.2s',
                                        '&:hover': { transform: 'scale(1.05)' }
                                    }}
                                >
                                    {firstLetter}
                                </Avatar>
                            </IconButton>

                            <Menu
                                anchorEl={profileAnchorEl}
                                open={isProfileMenuOpen}
                                onClose={handleProfileClose}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                sx={{
                                    '& .MuiPaper-root': {
                                        backgroundColor: '#1c1c1e',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white',
                                        borderRadius: '12px',
                                        minWidth: '180px',
                                        marginTop: '8px',
                                        boxShadow: '0 8px 16px rgba(0,0,0,0.5)'
                                    }
                                }}
                            >
                                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Logged in as</Typography>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'capitalize', color: 'white', mt: 0.5 }}>
                                        {userData.username}
                                    </Typography>
                                </Box>
                                <MenuItem 
                                    onClick={() => { handleProfileClose(); handleLogout(); }} 
                                    sx={{ 
                                        gap: 1.5, 
                                        py: 1.2, 
                                        fontSize: '0.9rem',
                                        '&:hover': { backgroundColor: 'rgba(235, 85, 69, 0.08)', color: '#EB5545' } 
                                    }}
                                >
                                    <LogoutIcon fontSize="small" />
                                    Logout
                                </MenuItem>
                            </Menu>
                        </>
                    )}
                </div>

                {/* --- MOBILE MENU ICON (Visible only on Mobile) --- */}
                <div className="mobileMenuIcon">
                    <IconButton onClick={toggleMenu} style={{color: 'white'}}>
                        {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
                    </IconButton>
                </div>
            </div>

            {/* --- MOBILE DROPDOWN (Conditionally Rendered) --- */}
            {isMenuOpen && (
                <div className="mobileMenuDropdown">
                    {userData && (
                        <div className="mobileMenuUserHeader">
                            <Avatar sx={{ bgcolor: '#EB5545', color: 'white', fontWeight: 'bold', width: 32, height: 32 }}>
                                {firstLetter}
                            </Avatar>
                            <span className="mobileUsername">{userData.username}</span>
                        </div>
                    )}
                    <div className="mobileMenuItem" onClick={() => { setIsMenuOpen(false); navigate("/history"); }}>
                        <RestoreIcon fontSize="small" />
                        <span>History</span>
                    </div>
                    <div className="mobileMenuItem" onClick={() => { setIsMenuOpen(false); handleLogout(); }}>
                        <LogoutIcon fontSize="small" />
                        <span>Logout</span>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="meetContainer">
                
                {/* Left Panel: Text & Input */}
                <div className="leftPanel">
                    <div>
                        <h2>Providing Quality Video Call Just Like Quality Education</h2>

                        <div className="inputGroup">
                            <TextField 
                                onChange={e => setMeetingCode(e.target.value)} 
                                id="outlined-basic" 
                                label="Meeting Code" 
                                variant="outlined" 
                                className="inputField" 
                                InputLabelProps={{ style: { color: 'grey' } }} 
                            />
                            <Button 
                                onClick={handleJoinVideoCall} 
                                variant='contained' 
                                className="joinBtn"
                            >
                                Join
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Illustration */}
                <div className='rightPanel'>
                    <img src='/logo3.png' alt="Video Conference Illustration" />
                </div>
            </div>
        </div>
    )
}

export default withAuth(HomeComponent)