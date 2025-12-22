import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../styles/HomeComponent.css"; 
import { Button, IconButton, TextField } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {

    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");

    // Removed addToUserHistory from here to prevent 500 error
    const { handleLogout } = useContext(AuthContext);

    let handleJoinVideoCall = async () => {
        if(meetingCode.trim() === "") return; 
        
        // Just navigate. History is now saved in videomeet.jsx on "End Call"
        navigate(`/${meetingCode}`)
    }

    return (
        <div className="homeContainer">
            
            {/* Navigation Bar */}
            <div className="navBar">
                <div style={{ display: "flex", alignItems: "center" }}>
                    <h2 className="logoText">OmniMeet</h2>
                </div>

                <div className="navRight">
                    {/* History Section */}
                    <div className="historyBtn" onClick={() => navigate("/history")}>
                        <IconButton className="iconBtn">
                            <RestoreIcon />
                        </IconButton>
                        <p>History</p>
                    </div>

                    {/* Logout Button */}
                    <Button 
                        onClick={handleLogout} 
                        className="logoutBtn" 
                        variant="outlined"
                    >
                        Logout
                    </Button>
                </div>
            </div>

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