import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    Box, Typography, Button, Paper, Chip, Fade
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import HomeIcon from '@mui/icons-material/Home';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import HistoryIcon from '@mui/icons-material/Restore';
import SecurityIcon from '@mui/icons-material/Security';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

export default function PostCallComponent() {
    const location = useLocation();
    const navigate = useNavigate();

    const meetingCode = location.state?.meetingCode || "";
    const rawToken = localStorage.getItem("token");
    const isGuest = location.state?.isGuest || !rawToken || rawToken === "null" || rawToken === "undefined";

    const [copied, setCopied] = useState(false);

    const handleCopyCode = () => {
        if (meetingCode) {
            navigator.clipboard.writeText(meetingCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleRejoin = () => {
        if (meetingCode) {
            navigate(`/${meetingCode}`);
        }
    };

    const handleGoHome = () => {
        if (isGuest) {
            navigate('/');
        } else {
            navigate('/home');
        }
    };

    const handleSignUp = () => {
        navigate('/auth', { state: { formState: 1 } });
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                minHeight: '100dvh',
                width: '100vw',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F8FAFC',
                backgroundImage: `
                    radial-gradient(circle at 20% 15%, rgba(255, 69, 58, 0.06) 0%, transparent 45%),
                    radial-gradient(circle at 80% 85%, rgba(2, 132, 199, 0.06) 0%, transparent 45%)
                `,
                position: 'relative',
                overflowX: 'hidden',
                overflowY: 'auto',
                py: { xs: 4, sm: 6 },
                px: { xs: 2, sm: 3 },
                boxSizing: 'border-box'
            }}
        >
            {/* Subtle Grid Background Pattern */}
            <Box
                sx={{
                    position: 'fixed',
                    inset: 0,
                    backgroundImage: 'radial-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            />

            {/* Top Minimalist Brand Header */}
            <Box
                sx={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    maxWidth: '560px',
                    mb: 3,
                    px: 1
                }}
            >
                <Box 
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.2, cursor: 'pointer' }} 
                    onClick={handleGoHome}
                >
                    <Box 
                        sx={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: '10px', 
                            background: 'linear-gradient(135deg, #FF453A 0%, #FF2D55 100%)', 
                            color: '#FFFFFF', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            boxShadow: '0 4px 14px rgba(255, 69, 58, 0.3)' 
                        }}
                    >
                        <VideoCallIcon fontSize="small" />
                    </Box>
                    <Typography 
                        sx={{ 
                            fontFamily: 'var(--font-heading, "Outfit", sans-serif)', 
                            fontWeight: 900, 
                            fontSize: '1.25rem', 
                            color: '#0F172A', 
                            letterSpacing: '-0.02em' 
                        }}
                    >
                        OmniMeet
                    </Typography>
                </Box>

                <Chip 
                    icon={<SecurityIcon sx={{ fontSize: '15px !important', color: '#059669 !important' }} />}
                    label="Call Ended"
                    size="small"
                    sx={{
                        backgroundColor: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        color: '#059669',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        fontFamily: 'var(--font-mono, monospace)',
                        px: 0.5
                    }}
                />
            </Box>

            {/* Main Google Meet / Zoom Style Post-Meeting Card */}
            <Paper
                elevation={0}
                sx={{
                    position: 'relative',
                    zIndex: 2,
                    background: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: { xs: '24px', sm: '32px' },
                    padding: { xs: '2.2rem 1.6rem', sm: '3rem 2.8rem' },
                    width: '100%',
                    maxWidth: '560px',
                    textAlign: 'center',
                    boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.95)',
                    boxSizing: 'border-box'
                }}
            >
                {/* Status Icon */}
                <Box
                    sx={{
                        width: '68px',
                        height: '68px',
                        borderRadius: '24px',
                        backgroundColor: '#ECFDF5',
                        border: '2px solid #A7F3D0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#059669',
                        margin: '0 auto 1.5rem auto',
                        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)'
                    }}
                >
                    <CheckCircleIcon sx={{ fontSize: '40px' }} />
                </Box>

                {/* Main Heading */}
                <Typography 
                    variant="h1"
                    sx={{ 
                        fontFamily: 'var(--font-heading, "Outfit", sans-serif)', 
                        fontWeight: 900, 
                        fontSize: { xs: '1.75rem', sm: '2.1rem' }, 
                        color: '#0F172A', 
                        letterSpacing: '-0.02em', 
                        lineHeight: 1.2,
                        mb: 1
                    }}
                >
                    You left the meeting
                </Typography>

                <Typography 
                    variant="body1" 
                    sx={{ 
                        color: '#64748B', 
                        fontWeight: 500, 
                        fontSize: { xs: '0.95rem', sm: '1.02rem' },
                        maxWidth: '420px',
                        mx: 'auto',
                        mb: 3
                    }}
                >
                    Have a great rest of your day! Your microphone and camera feeds have been safely disconnected.
                </Typography>

                {/* Meeting Code Badge */}
                {meetingCode && (
                    <Box
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1.5,
                            p: '8px 16px',
                            mb: 3.5,
                            borderRadius: '16px',
                            backgroundColor: '#F8FAFC',
                            border: '1.5px solid #E2E8F0',
                            maxWidth: '100%',
                            boxSizing: 'border-box'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LockOutlinedIcon sx={{ fontSize: 16, color: '#64748B' }} />
                            <Typography sx={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                                {meetingCode}
                            </Typography>
                        </Box>
                        <Button
                            size="small"
                            onClick={handleCopyCode}
                            startIcon={<ContentCopyIcon sx={{ fontSize: '15px !important' }} />}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                color: copied ? '#059669' : '#0284C7',
                                backgroundColor: copied ? '#ECFDF5' : 'rgba(2, 132, 199, 0.08)',
                                borderRadius: '10px',
                                px: 1.2,
                                py: 0.4,
                                '&:hover': {
                                    backgroundColor: copied ? '#D1FAE5' : 'rgba(2, 132, 199, 0.15)',
                                }
                            }}
                        >
                            {copied ? 'Copied' : 'Copy'}
                        </Button>
                    </Box>
                )}

                {/* Primary Action Buttons (Google Meet Style) */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {meetingCode && (
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={handleRejoin}
                            startIcon={<ReplayIcon />}
                            sx={{
                                background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
                                color: '#FFFFFF',
                                fontWeight: 800,
                                padding: '13px 24px',
                                borderRadius: '16px',
                                textTransform: 'none',
                                fontSize: '1rem',
                                fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                                boxShadow: '0 6px 20px rgba(2, 132, 199, 0.3)',
                                transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 10px 28px rgba(2, 132, 199, 0.45)',
                                }
                            }}
                        >
                            Rejoin Call
                        </Button>
                    )}

                    <Button
                        variant="contained"
                        fullWidth
                        onClick={handleGoHome}
                        startIcon={<HomeIcon />}
                        sx={{
                            background: 'linear-gradient(135deg, #FF453A 0%, #FF2D55 100%)',
                            color: '#FFFFFF',
                            fontWeight: 800,
                            padding: '13px 24px',
                            borderRadius: '16px',
                            textTransform: 'none',
                            fontSize: '1rem',
                            fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                            boxShadow: '0 6px 20px rgba(255, 69, 58, 0.35)',
                            transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 10px 28px rgba(255, 69, 58, 0.5)',
                            }
                        }}
                    >
                        Return to Home Screen
                    </Button>

                    {!isGuest ? (
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => navigate('/history')}
                            startIcon={<HistoryIcon />}
                            sx={{
                                borderColor: '#000000',
                                color: '#000000',
                                fontWeight: 700,
                                padding: '11px 24px',
                                borderRadius: '16px',
                                textTransform: 'none',
                                fontSize: '0.92rem',
                                fontFamily: 'var(--font-body, sans-serif)',
                                mt: 0.5,
                                '&:hover': {
                                    borderColor: '#000000',
                                    backgroundColor: '#F1F5F9',
                                    transform: 'translateY(-1px)'
                                }
                            }}
                        >
                            View Meeting History & Transcripts
                        </Button>
                    ) : (
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={handleSignUp}
                            sx={{
                                borderColor: '#000000',
                                color: '#000000',
                                fontWeight: 700,
                                padding: '11px 24px',
                                borderRadius: '16px',
                                textTransform: 'none',
                                fontSize: '0.92rem',
                                fontFamily: 'var(--font-body, sans-serif)',
                                mt: 0.5,
                                '&:hover': {
                                    borderColor: '#FF453A',
                                    color: '#FF453A',
                                    backgroundColor: '#FFF1F2',
                                    transform: 'translateY(-1px)'
                                }
                            }}
                        >
                            Create Free Account to Host Meetings
                        </Button>
                    )}
                </Box>
            </Paper>

            {/* Footer Notice */}
            <Typography 
                variant="caption" 
                sx={{ 
                    color: '#94A3B8', 
                    mt: 3, 
                    zIndex: 2, 
                    fontWeight: 600,
                    textAlign: 'center'
                }}
            >
                OmniMeet WebRTC Real-Time Conferencing • End-to-End Encrypted Session
            </Typography>
        </Box>
    );
}
