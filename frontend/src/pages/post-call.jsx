import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Rating } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import HomeIcon from '@mui/icons-material/Home';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import StarIcon from '@mui/icons-material/Star';

export default function PostCallComponent() {
    const location = useLocation();
    const navigate = useNavigate();
    const meetingCode = location.state?.meetingCode || "";

    const [rating, setRating] = useState(0);

    const handleRejoin = () => {
        if (meetingCode) {
            navigate(`/${meetingCode}`);
        }
    };

    const handleGoHome = () => {
        navigate('/home');
    };

    return (
        <Box
            sx={{
                height: '100vh',
                height: '100dvh',
                width: '100vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#121212',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundImage: 'url("/background1.png")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center center',
                    backgroundSize: 'cover',
                    opacity: 0.3,
                    zIndex: 1
                }
            }}
        >
            <Paper
                elevation={24}
                sx={{
                    position: 'relative',
                    zIndex: 2,
                    background: 'rgba(20, 20, 20, 0.85)',
                    backdropFilter: 'blur(15px)',
                    WebkitBackdropFilter: 'blur(15px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: { xs: '2rem 1.5rem', sm: '3rem' },
                    borderRadius: '24px',
                    textAlign: 'center',
                    width: '90%',
                    maxWidth: '480px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.5rem',
                }}
            >
                {/* Status Indicator */}
                <Box
                    sx={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(235, 85, 69, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#EB5545',
                        mb: 1
                    }}
                >
                    <CheckCircleOutlineIcon sx={{ fontSize: '42px' }} />
                </Box>

                {/* Status Text */}
                <Box>
                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                            fontWeight: 700,
                            color: 'white',
                            fontSize: { xs: '1.8rem', sm: '2.2rem' },
                            fontFamily: '"DM Sans", sans-serif'
                        }}
                    >
                        You left the meeting
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            color: 'rgba(255, 255, 255, 0.6)',
                            mt: 1,
                            fontSize: '0.95rem',
                            fontFamily: '"DM Sans", sans-serif'
                        }}
                    >
                        Your call has ended. You can rejoin or return to your dashboard.
                    </Typography>
                </Box>

                {/* Star Quality Rating */}
                <Box
                    sx={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        py: 2,
                        borderRadius: '16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontWeight: 500,
                            fontFamily: '"DM Sans", sans-serif'
                        }}
                    >
                        How was the audio/video quality?
                    </Typography>
                    <Rating
                        name="call-quality-rating"
                        value={rating}
                        onChange={(event, newValue) => {
                            setRating(newValue);
                        }}
                        emptyIcon={<StarIcon style={{ color: 'rgba(255,255,255,0.15)' }} fontSize="inherit" />}
                        sx={{
                            fontSize: '2rem',
                            color: '#EB5545',
                            '& .MuiRating-iconHover': {
                                color: '#ff3b2f',
                            }
                        }}
                    />
                    {rating > 0 && (
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', transition: 'opacity 0.3s' }}>
                            Thank you for your feedback!
                        </Typography>
                    )}
                </Box>

                {/* Actions Button Panel */}
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.8rem', mt: 1 }}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={handleRejoin}
                        disabled={!meetingCode}
                        startIcon={<ReplayIcon />}
                        sx={{
                            backgroundColor: '#EB5545',
                            color: 'white',
                            fontWeight: 600,
                            padding: '10px 24px',
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontSize: '0.95rem',
                            fontFamily: '"DM Sans", sans-serif',
                            '&:hover': {
                                backgroundColor: '#ff3b2f',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(235, 85, 69, 0.3)',
                            },
                            '&:disabled': {
                                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                color: 'rgba(255, 255, 255, 0.3)'
                            },
                            transition: 'all 0.2s ease-in-out'
                        }}
                    >
                        Rejoin Meeting
                    </Button>

                    <Button
                        variant="outlined"
                        fullWidth
                        onClick={handleGoHome}
                        startIcon={<HomeIcon />}
                        sx={{
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            fontWeight: 500,
                            padding: '10px 24px',
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontSize: '0.95rem',
                            fontFamily: '"DM Sans", sans-serif',
                            '&:hover': {
                                borderColor: 'white',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                transform: 'translateY(-1px)',
                            },
                            transition: 'all 0.2s ease-in-out'
                        }}
                    >
                        Return to Home
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
