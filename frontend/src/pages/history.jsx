import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime'; 
import CodeIcon from '@mui/icons-material/Code';
import { IconButton, Snackbar, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, List, ListItem, ListItemIcon, ListItemText, Divider, Box } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GavelIcon from '@mui/icons-material/Gavel';
import DescriptionIcon from '@mui/icons-material/Description';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import server from '../environment';
import "../styles/historyComponent.css"; 

export default function History() {
    const { getMeetingSessions } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([])
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    const [activeMeeting, setActiveMeeting] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [generatingId, setGeneratingId] = useState(null);

    const routeTo = useNavigate();

    const fetchHistory = async () => {
        try {
            const data = await getMeetingSessions();
            if (Array.isArray(data)) {
                setMeetings(data);
            } else {
                console.error("Invalid history format:", data);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to fetch meeting history");
            setOpen(true);
        }
    }

    useEffect(() => {
        fetchHistory();
    }, [])

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
            }
        } catch (err) {
            console.error("Error generating summary:", err);
            setError("Failed to generate AI summary. The transcript may be too short or contains invalid content.");
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
            setSuccessMsg("Meeting history deleted successfully!");
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
            navigator.clipboard.writeText(`Meeting Code: ${meeting.meetingCode}\nDate: ${formatDate(meeting.date)}\nTime: ${meeting.startTime} - ${meeting.endTime}\nNo AI Insights generated yet.`);
            setSuccessMsg("Copied meeting info to clipboard!");
            setSuccessOpen(true);
            return;
        }

        const text = `
Meeting Code: ${meeting.meetingCode}
Date: ${formatDate(meeting.date)}
Time: ${meeting.startTime} - ${meeting.endTime}

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

    let formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0")
        const year = date.getFullYear();
        return `${day}/${month}/${year}`
    }

    return (
        <div className="historyContainer">
            
            <div className="historyHeader">
                <IconButton className="backBtn" onClick={() => routeTo("/home")}>
                    <HomeIcon />
                </IconButton>
                <div className="titleBox">
                    <h2>Your Meeting History</h2>
                    <p>View details of your past connections</p>
                </div>
            </div>

            <div className="gridContainer">
                {meetings.length !== 0 ? (
                    meetings.map((e, i) => (
                        <Card key={e._id || i} className="historyCard" variant="outlined">
                            <CardContent className="cardContent">
                                
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <Typography className="meetingCode" sx={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <CodeIcon sx={{ color: '#EB5545', fontSize: 20 }} />
                                        {e.meetingCode}
                                    </Typography>
                                    <IconButton 
                                        size="small" 
                                        onClick={() => handleDeleteMeeting(e._id)} 
                                        sx={{ color: 'rgba(255, 255, 255, 0.4)', '&:hover': { color: '#EB5545' } }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>

                                <div className="cardDetails">
                                    <Typography className="dateText">
                                        <CalendarTodayIcon sx={{ fontSize: 16, opacity: 0.7 }} />
                                        {formatDate(e.date)}
                                    </Typography>

                                    <Typography className="dateText">
                                        <AccessTimeIcon sx={{ fontSize: 16, opacity: 0.7 }} />
                                        {e.startTime && e.endTime ? `${e.startTime} - ${e.endTime}` : "Duration N/A"}
                                    </Typography>
                                </div>

                                <Box sx={{ marginTop: 'auto', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {e.aiSummary && e.aiSummary.length > 0 ? (
                                        <Button 
                                            variant="contained" 
                                            size="small"
                                            startIcon={<AutoAwesomeIcon />}
                                            onClick={() => {
                                                setActiveMeeting(e);
                                                setDialogOpen(true);
                                            }}
                                            sx={{ backgroundColor: '#EB5545', '&:hover': { backgroundColor: '#ff3b2f' }, textTransform: 'none' }}
                                        >
                                            View AI Insights
                                        </Button>
                                    ) : (
                                        <Button 
                                            variant="outlined" 
                                            size="small"
                                            disabled={generatingId === e._id}
                                            startIcon={generatingId === e._id ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                                            onClick={() => handleGenerateSummary(e._id)}
                                            sx={{ 
                                                color: '#EB5545', 
                                                borderColor: '#EB5545', 
                                                '&:hover': { borderColor: '#ff3b2f', backgroundColor: 'rgba(235,85,69,0.08)' },
                                                textTransform: 'none',
                                                '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.1)' }
                                            }}
                                        >
                                            {generatingId === e._id ? 'Generating...' : 'Generate AI Summary'}
                                        </Button>
                                    )}

                                    <Button 
                                        variant="text" 
                                        size="small"
                                        startIcon={<ContentCopyIcon />}
                                        onClick={() => handleCopyToClipboard(e)}
                                        sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white', backgroundColor: 'rgba(255,255,255,0.05)' }, textTransform: 'none' }}
                                    >
                                        Copy Details
                                    </Button>
                                </Box>

                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="emptyState">
                        <h3>No meetings found</h3>
                        <p>Join a meeting to see it listed here.</p>
                    </div>
                )}
            </div>

            {/* AI Insights Dialog */}
            <Dialog 
                open={dialogOpen} 
                onClose={() => setDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        backgroundColor: '#1a1a1a',
                        color: 'white',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '10px'
                    }
                }}
            >
                {activeMeeting && (
                    <>
                        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AutoAwesomeIcon sx={{ color: '#EB5545' }} />
                                AI Meeting Insights ({activeMeeting.meetingCode})
                            </span>
                            <IconButton size="small" onClick={() => setDialogOpen(false)} style={{ color: 'white' }}>
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        
                        <DialogContent sx={{ borderColor: 'rgba(255,255,255,0.1)', maxHeight: '60vh', overflowY: 'auto' }}>
                            {/* Executive Summary */}
                            <div style={{ marginBottom: '20px' }}>
                                <Typography variant="subtitle1" sx={{ color: '#EB5545', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <DescriptionIcon fontSize="small" /> Executive Summary
                                </Typography>
                                {activeMeeting.aiSummary && activeMeeting.aiSummary.length > 0 ? (
                                    <List dense sx={{ paddingLeft: '5px' }}>
                                        {activeMeeting.aiSummary.map((s, idx) => (
                                            <ListItem key={idx} disableGutters sx={{ alignItems: 'flex-start' }}>
                                                <span style={{ color: '#EB5545', marginRight: '8px', fontSize: '1.1rem' }}>•</span>
                                                <ListItemText primary={s} primaryTypographyProps={{ style: { color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', lineHeight: '1.4' } }} />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>No executive summary generated.</Typography>
                                )}
                            </div>

                            <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: '15px' }} />

                            {/* Action Items */}
                            <div style={{ marginBottom: '20px' }}>
                                <Typography variant="subtitle1" sx={{ color: '#EB5545', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <CheckCircleIcon fontSize="small" /> Action Items
                                </Typography>
                                {activeMeeting.actionItems && activeMeeting.actionItems.length > 0 ? (
                                    <List dense sx={{ paddingLeft: '5px' }}>
                                        {activeMeeting.actionItems.map((a, idx) => (
                                            <ListItem key={idx} disableGutters sx={{ alignItems: 'flex-start' }}>
                                                <span style={{ color: '#EB5545', marginRight: '8px', fontSize: '1.1rem' }}>•</span>
                                                <ListItemText primary={a} primaryTypographyProps={{ style: { color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', lineHeight: '1.4' } }} />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>No action items listed.</Typography>
                                )}
                            </div>

                            <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: '15px' }} />

                            {/* Decisions */}
                            <div>
                                <Typography variant="subtitle1" sx={{ color: '#EB5545', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <GavelIcon fontSize="small" /> Key Decisions
                                </Typography>
                                {activeMeeting.decisions && activeMeeting.decisions.length > 0 ? (
                                    <List dense sx={{ paddingLeft: '5px' }}>
                                        {activeMeeting.decisions.map((d, idx) => (
                                            <ListItem key={idx} disableGutters sx={{ alignItems: 'flex-start' }}>
                                                <span style={{ color: '#EB5545', marginRight: '8px', fontSize: '1.1rem' }}>•</span>
                                                <ListItemText primary={d} primaryTypographyProps={{ style: { color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', lineHeight: '1.4' } }} />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>No key decisions recorded.</Typography>
                                )}
                            </div>
                        </DialogContent>
                        
                        <DialogActions sx={{ padding: '15px 20px', gap: '10px' }}>
                            <Button 
                                variant="outlined" 
                                startIcon={<ContentCopyIcon />}
                                onClick={() => handleCopyToClipboard(activeMeeting)}
                                sx={{ 
                                    color: '#EB5545', 
                                    borderColor: '#EB5545', 
                                    '&:hover': { borderColor: '#ff3b2f', backgroundColor: 'rgba(235,85,69,0.08)' },
                                    textTransform: 'none'
                                }}
                            >
                                Copy Insights
                            </Button>
                            <Button 
                                variant="contained" 
                                onClick={() => setDialogOpen(false)}
                                sx={{ backgroundColor: '#EB5545', '&:hover': { backgroundColor: '#ff3b2f' }, textTransform: 'none' }}
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
                <Alert onClose={() => setOpen(false)} severity="error" sx={{ width: '100%' }}>
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
                <Alert onClose={() => setSuccessOpen(false)} severity="success" sx={{ width: '100%', backgroundColor: '#4caf50', color: 'white' }}>
                    {successMsg}
                </Alert>
            </Snackbar>

        </div>
    )
}