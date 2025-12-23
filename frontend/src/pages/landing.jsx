import React, { useContext, useState } from 'react'
import "../App.css" // Ensure this imports the new CSS below
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar, Alert } from '@mui/material'; 

export default function LandingPage() {
    const router = useNavigate();
    const { userData, handleLogout } = useContext(AuthContext);

    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");

    const logoutUser = () => {
        handleLogout(); 
        setMessage("User Logout successfully"); 
        setOpen(true); 
    }

    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <h2>OmniMeet</h2>
                </div>
                <div className='navlist'>
                    <div className='guestBtn' onClick={() => router("/aljk23")}>
                        Join as Guest
                    </div>

                    {!userData ? (
                        <>
                            <div className='authBtn' onClick={() => router("/auth", { state: { formState: 1 } })}>
                                Register
                            </div>
                            <div className='authBtn loginBtn' onClick={() => router("/auth", { state: { formState: 0 } })}>
                                Login
                            </div>
                        </>
                    ) : (
                        <div className='authBtn loginBtn' onClick={logoutUser}>
                            Logout
                        </div>
                    )}
                </div>
            </nav>

            <div className="landingMainContainer">
                <div className="textSection">
                    <h1><span style={{ color: "#EB5545" }}>Connect</span> with your loved Ones</h1>
                    <p className='typingText'>Cover a distance by OmniMeet</p>
                    <div className="actionBtn" role='button'>
                        <Link to={userData ? "/home" : "/auth"}>Get Started</Link>
                    </div>
                </div>
                
                <div className="imageSection">
                    <img src="/mobile.png" alt="Mobile View" />
                </div>
            </div>

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
    )
}