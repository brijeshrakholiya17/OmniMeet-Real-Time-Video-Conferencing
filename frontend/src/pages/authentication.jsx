import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import '../styles/AuthStyles.css'; 
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar, Alert, IconButton, Box, TextField, Button, Typography } from '@mui/material'; 
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; 

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
                await handleRegister(name, username, password);
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
        <Box className="auth-container" style={{ position: 'relative' }}>
            
            {/* BACK BUTTON */}
            <Box style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
                <IconButton 
                    onClick={() => router("/")} 
                    sx={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.1)', '&:hover': { backgroundColor: '#EB5545' } }}
                >
                    <ArrowBackIcon />
                </IconButton>
            </Box>

            <Box className="auth-card">
                
                <Box className="auth-header text-center" sx={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <Typography variant="h4" component="h2" sx={{ fontWeight: 600, fontSize: '1.8rem', color: 'white', fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                        {formState === 0 ? "Welcome Back" : "Join the Community"}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem', fontWeight: 300 }}>
                        {formState === 0 
                            ? "Enter your credentials to access your account" 
                            : "Start your journey with us today"}
                    </Typography>
                </Box>

                <Box className="btn-toggle-group">
                    <Button 
                        variant="text"
                        className={`btn-toggle ${formState === 0 ? 'active' : ''}`}
                        onClick={() => { setFormState(0); setError(""); }}
                        sx={{ textTransform: 'none', color: 'inherit' }}
                    >
                        Sign In
                    </Button>
                    <Button 
                        variant="text"
                        className={`btn-toggle ${formState === 1 ? 'active' : ''}`}
                        onClick={() => { setFormState(1); setError(""); }}
                        sx={{ textTransform: 'none', color: 'inherit' }}
                    >
                        Sign Up
                    </Button>
                </Box>

                <form noValidate onSubmit={(e) => e.preventDefault()}>
                    
                    {formState === 1 && (
                        <TextField
                            label="Full Name"
                            variant="outlined"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            fullWidth
                            autoFocus
                            sx={{
                                marginBottom: '1.5rem',
                                '& .MuiOutlinedInput-root': {
                                    color: 'white',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '12px',
                                    '& fieldset': {
                                        borderColor: 'rgba(255, 255, 255, 0.2)',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'rgba(255, 255, 255, 0.3)',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#EB5545',
                                    },
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    '&.Mui-focused': {
                                        color: 'white',
                                    },
                                },
                            }}
                        />
                    )}

                    <TextField
                        label="Username"
                        variant="outlined"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        fullWidth
                        sx={{
                            marginBottom: '1.5rem',
                            '& .MuiOutlinedInput-root': {
                                color: 'white',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                '& fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                },
                                '&:hover fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#EB5545',
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&.Mui-focused': {
                                    color: 'white',
                                },
                            },
                        }}
                    />

                    <TextField
                        label="Password"
                        type="password"
                        variant="outlined"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                        sx={{
                            marginBottom: '1.5rem',
                            '& .MuiOutlinedInput-root': {
                                color: 'white',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                '& fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                },
                                '&:hover fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#EB5545',
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&.Mui-focused': {
                                    color: 'white',
                                },
                            },
                        }}
                    />

                    {error && (
                        <Alert 
                            severity="error" 
                            sx={{ 
                                marginBottom: '1.5rem', 
                                backgroundColor: 'rgba(220, 53, 69, 0.2)', 
                                color: '#ff6b6b', 
                                border: 'none',
                                '& .MuiAlert-icon': {
                                    color: '#ff6b6b'
                                }
                            }}
                        >
                            {error}
                        </Alert>
                    )}

                    <Button
                        onClick={handleAuth}
                        variant="contained"
                        sx={{
                            backgroundColor: '#EB5545',
                            border: 'none',
                            padding: '0.8rem',
                            fontWeight: 600,
                            fontSize: '1.1rem',
                            borderRadius: '30px',
                            marginTop: '1rem',
                            width: '100%',
                            color: 'white',
                            textTransform: 'none',
                            transition: 'transform 0.2s, background-color 0.2s',
                            '&:hover': {
                                backgroundColor: '#ff6b5b',
                                transform: 'translateY(-2px)',
                            },
                        }}
                    >
                        {formState === 0 ? "Login" : "Register"}
                    </Button>
                </form>
            </Box>

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
        </Box>
    );
}