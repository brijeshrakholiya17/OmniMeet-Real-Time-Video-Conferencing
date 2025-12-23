import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../styles/HomeComponent.css"; 
import { Button, IconButton, TextField } from '@mui/material';
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

    const { handleLogout } = useContext(AuthContext);

    let handleJoinVideoCall = async () => {
        if(meetingCode.trim() === "") return; 
        navigate(`/${meetingCode}`)
    }

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    }

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

                    <Button 
                        onClick={handleLogout} 
                        className="logoutBtn" 
                        variant="outlined"
                    >
                        Logout
                    </Button>
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
                    <div className="mobileMenuItem" onClick={() => navigate("/history")}>
                        <RestoreIcon fontSize="small" />
                        <span>History</span>
                    </div>
                    <div className="mobileMenuItem" onClick={handleLogout}>
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