import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime'; 
import CodeIcon from '@mui/icons-material/Code';
import { 
    IconButton, 
    Snackbar, 
    Alert, 
    Button, 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    CircularProgress, 
    List, 
    ListItem, 
    ListItemText, 
    Divider, 
    Box,
    Tooltip
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GavelIcon from '@mui/icons-material/Gavel';
import DescriptionIcon from '@mui/icons-material/Description';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import HistoryToggleOffIcon from '@mui/icons-material/HistoryToggleOff';
import axios from 'axios';
import server from '../environment';
import "../styles/historyComponent.css"; 

export default function History() {
    const { getMeetingSessions } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    const [activeMeeting, setActiveMeeting] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [generatingId, setGeneratingId] = useState(null);

    const routeTo = useNavigate();

    const fetchHistory = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            setMeetings([]);
            return;
        }
        try {
            const data = await getMeetingSessions();
            if (Array.isArray(data)) {
                setMeetings(data);
            } else {
                console.warn("Invalid history response format:", data);
                setMeetings([]);
            }
        } catch (err) {
            console.error("Error fetching history:", err?.message || err);
            setMeetings([]);
            if (err?.response?.status === 401) {
                setError("Session expired or invalid token. Please log in again.");
                setOpen(true);
                setTimeout(() => {
                    routeTo("/auth");
                }, 1500);
            }
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleGenerateSummary = async (meetingId) => {
        setGeneratingId(meetingId);
        try {
            const response = await axios.post(`${server}/api/meeting/${meetingId}/generate-summary`, {}, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            const updatedMeeting = response.data.meeting;
            setMeetings(prev => prev.map(m => m._id === meetingId ? updatedMeeting : m));
            setSuccessMsg("AI Summary generated successfully!");
            setSuccessOpen(true);
            
            if (activeMeeting && activeMeeting._id === meetingId) {
                setActiveMeeting(updatedMeeting);
            } else {
                setActiveMeeting(updatedMeeting);
                setDialogOpen(true);
            }
        } catch (err) {
            console.error("Error generating summary:", err);
            const serverMsg = err.response?.data?.message;
            setError(serverMsg || "Failed to generate AI summary. Please check your network or try again.");
            setOpen(true);
        } finally {
            setGeneratingId(null);
        }
    };

    const handleDeleteMeeting = async (meetingId) => {
        try {
            await axios.delete(`${server}/api/meeting/${meetingId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            setMeetings(prev => prev.filter(m => m._id !== meetingId));
            setSuccessMsg("Meeting record deleted successfully!");
            setSuccessOpen(true);
        } catch (err) {
            console.error("Error deleting meeting:", err);
            setError("Failed to delete the meeting history.");
            setOpen(true);
        }
    };

    const handleCopyToClipboard = (meeting) => {
        const hasSummary = meeting.aiSummary && meeting.aiSummary.length > 0;
        const hasActionItems = meeting.actionItems && meeting.actionItems.length > 0;
        const hasDecisions = meeting.decisions && meeting.decisions.length > 0;

        if (!hasSummary && !hasActionItems && !hasDecisions) {
            navigator.clipboard.writeText(`Meeting Code: ${meeting.meetingCode}\nDate: ${formatDate(meeting.date)}\nTime: ${meeting.startTime || 'N/A'} - ${meeting.endTime || 'N/A'}\nNo AI Insights generated yet.`);
            setSuccessMsg("Copied meeting info to clipboard!");
            setSuccessOpen(true);
            return;
        }

        const text = `
Meeting Code: ${meeting.meetingCode}
Date: ${formatDate(meeting.date)}
Time: ${meeting.startTime || 'N/A'} - ${meeting.endTime || 'N/A'}

=== Executive Summary ===
${hasSummary ? meeting.aiSummary.map(s => `• ${s}`).join('\n') : 'No summary points.'}

=== Action Items ===
${hasActionItems ? meeting.actionItems.map(a => `• ${a}`).join('\n') : 'No action items.'}

=== Key Decisions ===
${hasDecisions ? meeting.decisions.map(d => `• ${d}`).join('\n') : 'No decisions recorded.'}
        `.trim();

        navigator.clipboard.writeText(text);
        setSuccessMsg("Copied AI insights to clipboard!");
        setSuccessOpen(true);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="historyContainer lightTheme">
            {/* Ambient Background Atmosphere */}
            <div className="historyGlow glowTop"></div>
            <div className="historyGlow glowBottom"></div>
            <div className="historyGridOverlay"></div>

            {/* Top Navigation & Header Bar */}
            <header className="historyHeader">
                <div className="historyHeaderLeft">
                    <button className="historyBackBtn" onClick={() => routeTo("/home")} aria-label="Back to Dashboard">
                        <HomeIcon fontSize="small" />
                        <span>Home</span>
                    </button>
                    <div className="titleBox">
                        <h2>Conference Archives</h2>
                        <p>Past video meetings, transcripts, and AI-generated insights</p>
                    </div>
                </div>

                <div className="historyHeaderRight">
                    <div className="sessionCountBadge">
                        <span>{meetings.length} Total Meetings</span>
                    </div>
                </div>
            </header>

            {/* Cards Grid */}
            <main className="historyContentArea">
                {meetings.length !== 0 ? (
                    <div className="gridContainer">
                        {meetings.map((e, i) => (
                            <Card key={e._id || i} className="historyCard" variant="outlined">
                                <CardContent className="cardContent">
                                    
                                    {/* Card Top Row */}
                                    <div className="cardHeaderRow">
                                        <div className="codeChip">
                                            <CodeIcon className="codeSvg" />
                                            <span className="codeText">{e.meetingCode}</span>
                                        </div>
                                        <Tooltip title="Delete Record">
                                            <IconButton 
                                                size="small" 
                                                onClick={() => handleDeleteMeeting(e._id)} 
                                                className="deleteBtn"
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </div>

                                    {/* Date & Time Metadata */}
                                    <div className="cardDetailsBox">
                                        <div className="metaRow">
                                            <CalendarTodayIcon className="metaIcon" />
                                            <span>{formatDate(e.date)}</span>
                                        </div>

                                        <div className="metaRow">
                                            <AccessTimeIcon className="metaIcon" />
                                            <span>{e.startTime && e.endTime ? `${e.startTime} - ${e.endTime}` : "Call Recorded"}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons Row */}
                                    <div className="cardActionsWrapper">
                                        {e.aiSummary && e.aiSummary.length > 0 ? (
                                            <Button 
                                                variant="contained" 
                                                size="small"
                                                startIcon={<AutoAwesomeIcon />}
                                                onClick={() => {
                                                    setActiveMeeting(e);
                                                    setDialogOpen(true);
                                                }}
                                                className="viewAiBtn"
                                            >
                                                View AI Summary
                                            </Button>
                                        ) : (
                                            <Button 
                                                variant="outlined" 
                                                size="small"
                                                disabled={generatingId === e._id || !e.transcript || e.transcript.length === 0}
                                                startIcon={generatingId === e._id ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                                                onClick={() => handleGenerateSummary(e._id)}
                                                className="generateAiBtn"
                                            >
                                                {generatingId === e._id ? 'Analyzing...' : (!e.transcript || e.transcript.length === 0) ? 'No Transcript' : 'Generate Summary'}
                                            </Button>
                                        )}

                                        <Button 
                                            variant="text" 
                                            size="small"
                                            startIcon={<ContentCopyIcon />}
                                            onClick={() => handleCopyToClipboard(e)}
                                            className="copyDetailsBtn"
                                        >
                                            Copy Info
                                        </Button>
                                    </div>

                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="emptyState">
                        <div className="emptyIconWrapper">
                            <HistoryToggleOffIcon className="emptySvg" />
                        </div>
                        <h3>No Meeting Archives Found</h3>
                        <p>When you complete video calls, your transcripts and AI summaries will be cataloged here.</p>
                        <Button 
                            variant="contained" 
                            className="emptyLaunchBtn"
                            startIcon={<VideoCallIcon />}
                            onClick={() => routeTo("/home")}
                        >
                            Start a Meeting
                        </Button>
                    </div>
                )}
            </main>

            {/* AI Insights Dialog Modal */}
            <Dialog 
                open={dialogOpen} 
                onClose={() => setDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    className: 'insightsDialogPaper',
                    sx: {
                        backgroundColor: '#ffffff !important',
                        color: '#0f172a !important',
                        borderRadius: '28px',
                        border: '1.5px solid #e2e8f0',
                        boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.12)',
                        padding: '16px',
                        backgroundImage: 'none'
                    }
                }}
            >
                {activeMeeting && (
                    <>
                        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1.5, backgroundColor: '#ffffff', color: '#0f172a' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>
                                <AutoAwesomeIcon sx={{ color: '#FF453A', fontSize: '1.4rem' }} />
                                AI Meeting Insights
                            </span>
                            <IconButton size="small" onClick={() => setDialogOpen(false)} sx={{ color: '#64748b', backgroundColor: '#f1f5f9', '&:hover': { backgroundColor: '#e2e8f0', color: '#0f172a' } }}>
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        
                        <DialogContent sx={{ maxHeight: '65vh', overflowY: 'auto', backgroundColor: '#ffffff', px: { xs: 1.5, sm: 2.5 }, py: 1 }}>
                            {/* Executive Summary Section Card */}
                            <Box sx={{ 
                                mb: 2.5, 
                                p: 2, 
                                backgroundColor: '#F0F9FF', 
                                border: '1px solid #BAE6FD', 
                                borderRadius: '20px' 
                            }}>
                                <Typography variant="subtitle1" sx={{ color: '#0369A1', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', mb: 1, fontFamily: 'var(--font-heading)', fontSize: '0.98rem' }}>
                                    <DescriptionIcon fontSize="small" sx={{ color: '#0284C7' }} /> Executive Summary
                                </Typography>
                                {activeMeeting.aiSummary && activeMeeting.aiSummary.length > 0 ? (
                                    <List dense disablePadding>
                                        {activeMeeting.aiSummary.map((s, idx) => (
                                            <ListItem key={idx} disableGutters sx={{ alignItems: 'flex-start', py: 0.6 }}>
                                                <span style={{ color: '#0284C7', marginRight: '10px', fontSize: '1.2rem', lineHeight: '1.2' }}>•</span>
                                                <ListItemText 
                                                    primary={s} 
                                                    primaryTypographyProps={{ style: { color: '#0F172A', fontSize: '0.92rem', lineHeight: '1.55', fontWeight: 500 } }} 
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body2" sx={{ color: '#64748B', fontStyle: 'italic', fontSize: '0.88rem' }}>No executive summary generated.</Typography>
                                )}
                            </Box>

                            {/* Action Items Section Card */}
                            <Box sx={{ 
                                mb: 2.5, 
                                p: 2, 
                                backgroundColor: '#ECFDF5', 
                                border: '1px solid #A7F3D0', 
                                borderRadius: '20px' 
                            }}>
                                <Typography variant="subtitle1" sx={{ color: '#047857', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', mb: 1, fontFamily: 'var(--font-heading)', fontSize: '0.98rem' }}>
                                    <CheckCircleIcon fontSize="small" sx={{ color: '#10B981' }} /> Action Items
                                </Typography>
                                {activeMeeting.actionItems && activeMeeting.actionItems.length > 0 ? (
                                    <List dense disablePadding>
                                        {activeMeeting.actionItems.map((a, idx) => (
                                            <ListItem key={idx} disableGutters sx={{ alignItems: 'flex-start', py: 0.6 }}>
                                                <span style={{ color: '#10B981', marginRight: '10px', fontSize: '1.2rem', lineHeight: '1.2' }}>•</span>
                                                <ListItemText 
                                                    primary={a} 
                                                    primaryTypographyProps={{ style: { color: '#0F172A', fontSize: '0.92rem', lineHeight: '1.55', fontWeight: 500 } }} 
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body2" sx={{ color: '#64748B', fontStyle: 'italic', fontSize: '0.88rem' }}>No action items listed.</Typography>
                                )}
                            </Box>

                            {/* Decisions Section Card */}
                            <Box sx={{ 
                                p: 2, 
                                backgroundColor: '#FFF1F2', 
                                border: '1px solid #FECDD3', 
                                borderRadius: '20px' 
                            }}>
                                <Typography variant="subtitle1" sx={{ color: '#BE123C', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', mb: 1, fontFamily: 'var(--font-heading)', fontSize: '0.98rem' }}>
                                    <GavelIcon fontSize="small" sx={{ color: '#FF453A' }} /> Key Decisions
                                </Typography>
                                {activeMeeting.decisions && activeMeeting.decisions.length > 0 ? (
                                    <List dense disablePadding>
                                        {activeMeeting.decisions.map((d, idx) => (
                                            <ListItem key={idx} disableGutters sx={{ alignItems: 'flex-start', py: 0.6 }}>
                                                <span style={{ color: '#FF453A', marginRight: '10px', fontSize: '1.2rem', lineHeight: '1.2' }}>•</span>
                                                <ListItemText 
                                                    primary={d} 
                                                    primaryTypographyProps={{ style: { color: '#0F172A', fontSize: '0.92rem', lineHeight: '1.55', fontWeight: 500 } }} 
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body2" sx={{ color: '#64748B', fontStyle: 'italic', fontSize: '0.88rem' }}>No key decisions recorded.</Typography>
                                )}
                            </Box>
                        </DialogContent>
                        
                        <DialogActions sx={{ padding: '16px 20px', gap: '10px', backgroundColor: '#ffffff', borderTop: '1px solid #F1F5F9' }}>
                            <Button 
                                variant="outlined" 
                                startIcon={<ContentCopyIcon />}
                                onClick={() => handleCopyToClipboard(activeMeeting)}
                                sx={{ 
                                    color: '#0284C7', 
                                    borderColor: '#cbd5e1', 
                                    backgroundColor: '#ffffff',
                                    borderRadius: '14px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    '&:hover': {
                                        backgroundColor: '#F0F9FF',
                                        borderColor: '#0284C7'
                                    }
                                }}
                            >
                                Copy Insights
                            </Button>
                            <Button 
                                variant="contained" 
                                onClick={() => setDialogOpen(false)}
                                sx={{ 
                                    backgroundColor: '#F1F5F9', 
                                    color: '#0F172A',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '14px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    boxShadow: 'none',
                                    '&:hover': { 
                                        backgroundColor: '#E2E8F0',
                                        color: '#0F172A',
                                        boxShadow: 'none'
                                    }
                                }}
                            >
                                Close
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Error Snackbar */}
            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setOpen(false)} severity="error" sx={{ width: '100%', borderRadius: '14px' }}>
                    {error}
                </Alert>
            </Snackbar>

            {/* Success Snackbar */}
            <Snackbar
                open={successOpen}
                autoHideDuration={3000}
                onClose={() => setSuccessOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSuccessOpen(false)} severity="success" sx={{ width: '100%', borderRadius: '14px' }}>
                    {successMsg}
                </Alert>
            </Snackbar>

        </div>
    );
}