import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import '../styles/AuthStyles.css'; 
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar, Alert, IconButton, Box, TextField, Button, Typography, CircularProgress } from '@mui/material'; 
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; 
import VideoCallIcon from '@mui/icons-material/VideoCall';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';

export default function Authentication() {
    const { handleLogin, handleRegister } = useContext(AuthContext);
    const router = useNavigate(); 
    const location = useLocation(); 

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    
    const [formState, setFormState] = useState(location.state?.formState || 0); 
    
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (location.state?.formState !== undefined) {
            setFormState(location.state.formState);
        }
        if (location.state?.message) {
            setError(location.state.message);
        }
    }, [location.state]);

    const handleAuth = async (e) => {
        if (e) e.preventDefault();
        setError("");

        if (!username.trim()) {
            setError("Username is required");
            return;
        }
        if (username.length > 20) {
            setError("Username must be at most 20 characters");
            return;
        }
        if (!password) {
            setError("Password is required");
            return;
        }
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            setError("Password must contain at least one letter, one number, and one special character (minimum 8 characters)");
            return;
        }

        setIsLoading(true);
        try {
            if (formState === 0) {
                await handleLogin(username, password); 
                setMessage("Login successful. Redirecting...");
                setOpen(true);
                setError("");
                setTimeout(() => {
                    router("/home"); 
                }, 800); 
            } 
            else if (formState === 1) {
                await handleRegister(name, username, password);
                setMessage("Account registered successfully! You can now log in.");      
                setOpen(true);            
                setError("");             
                setFormState(0);          
                setUsername("");          
                setPassword("");
                setName("");
            }
        } catch (err) {
            console.error("Auth error:", err);
            let errMsg = err?.response?.data?.message || err?.response?.data || err?.message || "Something went wrong";
            if (typeof errMsg !== "string") {
                errMsg = "Authentication failed. Please check your credentials.";
            }
            setError(errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="authContainer lightTheme">
            {/* Ambient Pastel Glow Mesh */}
            <div className="authGlow glowLeft"></div>
            <div className="authGlow glowRight"></div>
            <div className="authGridOverlay"></div>

            {/* Back to Home Button */}
            <div className="authBackWrapper">
                <button 
                    onClick={() => router("/")} 
                    className="authBackBtn"
                    aria-label="Back to Homepage"
                >
                    <ArrowBackIcon fontSize="small" />
                    <span>Back to Home</span>
                </button>
            </div>

            {/* Main Auth Centerpiece Card */}
            <div className="authCardWrapper">
                <div className="authCard">
                    
                    {/* Brand Badge */}
                    <div className="authBrandHeader">
                        <div className="authBrandIcon">
                            <VideoCallIcon className="authBrandSvg" />
                        </div>
                        <h2 className="authBrandTitle">OmniMeet</h2>
                        <span className="authBrandSub">Secure Access Portal</span>
                    </div>

                    <div className="authTitleSection">
                        <h1 className="authMainHeading">
                            {formState === 0 ? "Welcome Back" : "Create Account"}
                        </h1>
                        <p className="authSubHeading">
                            {formState === 0 
                                ? "Enter your credentials to enter your conference hub" 
                                : "Join the next-generation video conferencing mesh"}
                        </p>
                    </div>

                    {/* Dual Mode Toggle Pill */}
                    <div className="authToggleGroup">
                        <button 
                            type="button"
                            className={`authToggleBtn ${formState === 0 ? 'active' : ''}`}
                            onClick={() => { setFormState(0); setError(""); }}
                        >
                            Sign In
                        </button>
                        <button 
                            type="button"
                            className={`authToggleBtn ${formState === 1 ? 'active' : ''}`}
                            onClick={() => { setFormState(1); setError(""); }}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Form Input Fields */}
                    <form onSubmit={handleAuth} noValidate className="authForm">
                        
                        {formState === 1 && (
                            <div className="formInputGroup">
                                <label className="inputLabel">Full Name</label>
                                <div className="inputWithIcon">
                                    <BadgeOutlinedIcon className="fieldIcon" />
                                    <TextField
                                        placeholder="e.g. John Doe"
                                        variant="standard"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        fullWidth
                                        autoFocus
                                        InputProps={{ disableUnderline: true }}
                                        className="authTextField"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="formInputGroup">
                            <label className="inputLabel">Username</label>
                            <div className="inputWithIcon">
                                <PersonOutlineOutlinedIcon className="fieldIcon" />
                                <TextField
                                    placeholder="Enter your username"
                                    variant="standard"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    fullWidth
                                    InputProps={{ disableUnderline: true }}
                                    className="authTextField"
                                />
                            </div>
                        </div>

                        <div className="formInputGroup">
                            <label className="inputLabel">Password</label>
                            <div className="inputWithIcon">
                                <LockOutlinedIcon className="fieldIcon" />
                                <TextField
                                    placeholder="••••••••"
                                    type="password"
                                    variant="standard"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    fullWidth
                                    InputProps={{ disableUnderline: true }}
                                    className="authTextField"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="authErrorBanner">
                                <span>{error}</span>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isLoading}
                            variant="contained"
                            className="authSubmitBtn"
                        >
                            {isLoading ? (
                                <CircularProgress size={22} sx={{ color: 'white' }} />
                            ) : (
                                formState === 0 ? "Sign In to Studio" : "Create My Account"
                            )}
                        </Button>
                    </form>

                    <div className="authFooterNote">
                        <span>Protected by end-to-end P2P encryption</span>
                    </div>
                </div>
            </div>

            {/* Notification Snackbar */}
            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setOpen(false)} severity="success" sx={{ width: '100%', borderRadius: '14px' }}>
                    {message}
                </Alert>
            </Snackbar>
        </div>
    );
}