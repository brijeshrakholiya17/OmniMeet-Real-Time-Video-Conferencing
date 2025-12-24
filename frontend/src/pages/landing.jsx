import React, { useContext, useState, useEffect } from 'react' // <--- Added useEffect
import "../App.css"
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar, Alert } from '@mui/material'; 

export default function LandingPage() {
    const router = useNavigate();
    const { userData, handleLogout } = useContext(AuthContext);

    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");

    // --- TYPEWRITER STATE ---
    const [typedText, setTypedText] = useState("");
    const targetText = "Cover a distance by OmniMeet";

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
        }, 100); // Adjust typing speed (ms) here

        return () => clearInterval(typingInterval);
    }, []);

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
                    
                    {/* UPDATED TYPING TEXT ELEMENT */}
                    <p className='typingText'>{typedText}</p>
                    
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