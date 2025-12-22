import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Import useLocation
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/AuthStyles.css'; 
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar, Alert, IconButton } from '@mui/material'; 
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Import Back Icon

export default function Authentication() {
    
    const { handleLogin, handleRegister } = useContext(AuthContext);
    const router = useNavigate(); 
    const location = useLocation(); // Hook to get data sent from Landing Page

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    
    // Initialize formState based on passed state (Default to 0/Login if nothing passed)
    // location.state?.formState will be 1 if Register was clicked, 0 if Login was clicked
    const [formState, setFormState] = useState(location.state?.formState || 0); 
    
    const [open, setOpen] = useState(false);

    // Ensure state updates if user navigates back/forth
    useEffect(() => {
        if (location.state?.formState !== undefined) {
            setFormState(location.state.formState);
        }
    }, [location.state]);


    const handleAuth = async () => {
        try {
            if (formState === 0) {
                await handleLogin(username, password); 
                setMessage("User login successfully");
                setOpen(true);
                setError("");
                setTimeout(() => {
                    router("/home"); 
                }, 1000); 
            } 
            else if (formState === 1) {
                let result = await handleRegister(name, username, password);
                setMessage("New user registered successfully");      
                setOpen(true);            
                setError("");             
                setFormState(0);          
                setUsername("");          
                setPassword("");
                setName("");
            }
        } catch (err) {
            console.error(err);
            let errMsg = err?.response?.data?.message || "Something went wrong";
            setError(errMsg);
        }
    };

    return (
        <div className="auth-container" style={{ position: 'relative' }}>
            
            {/* --- BACK BUTTON --- */}
            {/* Placed absolutely at top-left of the container */}
            <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
                <IconButton 
                    onClick={() => router("/")} 
                    sx={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.1)', '&:hover': { backgroundColor: '#EB5545' } }}
                >
                    <ArrowBackIcon />
                </IconButton>
            </div>

            <div className="auth-card">
                
                <div className="auth-header text-center">
                    <h2>{formState === 0 ? "Welcome Back" : "Join the Community"}</h2>
                    <p>
                        {formState === 0 
                            ? "Enter your credentials to access your account" 
                            : "Start your journey with us today"}
                    </p>
                </div>

                <div className="btn-toggle-group">
                    <button 
                        type="button" 
                        className={`btn-toggle ${formState === 0 ? 'active' : ''}`}
                        onClick={() => { setFormState(0); setError(""); }}
                    >
                        Sign In
                    </button>
                    <button 
                        type="button" 
                        className={`btn-toggle ${formState === 1 ? 'active' : ''}`}
                        onClick={() => { setFormState(1); setError(""); }}
                    >
                        Sign Up
                    </button>
                </div>

                <form noValidate onSubmit={(e) => e.preventDefault()}>
                    
                    {formState === 1 && (
                        <div className="form-floating mb-3">
                            <input
                                type="text"
                                className="form-control"
                                id="fullName"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                            <label htmlFor="fullName">Full Name</label>
                        </div>
                    )}

                    <div className="form-floating mb-3">
                        <input
                            type="text"
                            className="form-control"
                            id="username"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <label htmlFor="username">Username</label>
                    </div>

                    <div className="form-floating mb-3">
                        <input
                            type="password"
                            className="form-control"
                            id="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <label htmlFor="password">Password</label>
                    </div>

                    {error && (
                        <div className="alert alert-danger py-2" style={{background: 'rgba(220, 53, 69, 0.2)', color: '#ff6b6b', border: 'none'}}>
                            {error}
                        </div>
                    )}

                    <button
                        type="button"
                        className="btn btn-primary-custom"
                        onClick={handleAuth}
                    >
                        {formState === 0 ? "Login" : "Register"}
                    </button>
                </form>
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
    );
}