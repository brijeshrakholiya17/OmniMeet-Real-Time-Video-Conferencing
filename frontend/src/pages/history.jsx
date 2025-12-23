import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // New Icon
import CodeIcon from '@mui/icons-material/Code';
import { IconButton, Snackbar, Alert } from '@mui/material';
import "../styles/historyComponent.css"; 

export default function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([])
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);

    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                
                // --- DEBUGGING LOG ---
                console.log("HISTORY DATA RECEIVED:", history); 

                // Check if 'history' is an array before reversing
                if (Array.isArray(history)) {
                    setMeetings(history.reverse());
                } else if (history.activity) {
                    // Scenario: Backend returns { message: "...", activity: [...] }
                    setMeetings(history.activity.reverse());
                } else if (history.meetings) {
                    // Scenario: Backend returns { meetings: [...] }
                    setMeetings(history.meetings.reverse());
                } else {
                    console.error("Invalid history format:", history);
                }
                
            } catch (err) {
                console.log(err); // See the real error in Console
                setError("Failed to fetch meeting history");
                setOpen(true);
            }
        }
        fetchHistory();
    }, [getHistoryOfUser])

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
                        <Card key={i} className="historyCard" variant="outlined">
                            <CardContent className="cardContent">
                                
                                <Typography className="meetingCode" gutterBottom>
                                    <CodeIcon sx={{ color: '#EB5545', fontSize: 20 }} />
                                    {e.meetingCode}
                                </Typography>

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

        </div>
    )
}