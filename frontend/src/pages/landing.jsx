import React, { useContext, useState } from 'react'
import "../App.css"
import { Link, useNavigate } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar, Alert } from '@mui/material'; 

export default function LandingPage() {
    const router = useNavigate();
    const { userData, handleLogout } = useContext(AuthContext);

    // Local State for Snackbar
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");

    // Custom Logout Function
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
                    <p className='btn btn-outline-light' onClick={() => {
                        router("/aljk23")
                    }}>Join as Guest</p>

                    {!userData && (
                        <p className='btn btn-outline-custom-red' onClick={() => {
                            // 1. Pass state: { formState: 1 } for Register
                            router("/auth", { state: { formState: 1 } })
                        }}>
                            Register
                        </p>
                    )}

                    {!userData ? (
                        <div onClick={() => {
                            // 2. Pass state: { formState: 0 } for Login
                            router("/auth", { state: { formState: 0 } })
                        }} role='button'>
                            <p className='btn btn-outline-custom-red'>Login</p>
                        </div>
                    ) : (
                        <div onClick={logoutUser} role='button'>
                            <p className='btn btn-outline-custom-red'>Logout</p>
                        </div>
                    )}
                </div>
            </nav>


            <div className="landingMainContainer">
                <div>
                    <h1><span style={{ color: "#EB5545" }}>Connect</span> with your loved Ones</h1>
                    <p className='typingText'>Cover a distance by OmniMeet</p>
                    <div role='button'>
                        <Link to={userData ? "/home" : "/auth"}>Get Started</Link>
                    </div>
                </div>
                <div>
                    <img src="/mobile.png" alt="" />
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