import React, { useEffect, useRef, useState } from 'react';
import { 
    Paper, IconButton, Slider, Tooltip, Divider, Box, Typography, 
    useMediaQuery, Popover, Dialog, DialogTitle, DialogContent, 
    DialogContentText, DialogActions, Button 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import BrushIcon from '@mui/icons-material/Brush';
import UndoIcon from '@mui/icons-material/Undo';
import CloseIcon from '@mui/icons-material/Close';
import TuneIcon from '@mui/icons-material/Tune';

// Custom SVG Icons for Tools
const PenToolIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.5 7.5" />
    </svg>
);

const LineToolIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="4" y1="20" x2="20" y2="4" />
    </svg>
);

const RectToolIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
);

const CircleToolIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="12" cy="12" r="8.5" />
    </svg>
);

const EraserToolIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.24 7.56l4.24 4.24c.78.78.78 2.05 0 2.83L13.59 21H21v-2h-3.59l4.24-4.24c1.56-1.56 1.56-4.09 0-5.66l-5.66-5.66c-1.56-1.56-4.09-1.56-5.66 0L2.24 12.03c-.78.78-.78 2.05 0 2.83L6.5 19.1c.78.78 2.05.78 2.83 0l6.91-6.91-2.83-2.83-6.91 6.91-2.83-2.83 7.07-7.07c1.56-1.56 4.09-1.56 5.66 0z" />
    </svg>
);

const RedoToolIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>
    </svg>
);

const PRESET_COLORS = ['#FF453A', '#0284C7', '#10B981', '#F59E0B', '#8B5CF6', '#0F172A', '#64748B'];

export default function Whiteboard({ socket, room, initialHistory, onStrokeAdded, onClearBoard, onUndo, onClose }) {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const containerRef = useRef(null);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const startPosRef = useRef({ x: 0, y: 0 });
    const currentPosRef = useRef({ x: 0, y: 0 });
    const currentStrokeIdRef = useRef(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [activeTool, setActiveTool] = useState('pen'); // 'pen', 'line', 'rectangle', 'circle', 'eraser'
    const [color, setColor] = useState('#FF453A');
    const [brushSize, setBrushSize] = useState(4);
    const [eraserSize, setEraserSize] = useState(24);
    const [isEraser, setIsEraser] = useState(false);
    const [brushType, setBrushType] = useState('solid'); // 'solid', 'highlighter', 'dashed'
    const [localHistory, setLocalHistory] = useState(initialHistory || []);
    const [redoStack, setRedoStack] = useState([]);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);

    // Mobile floating tools box visibility
    const [isToolsOpenMobile, setIsToolsOpenMobile] = useState(true);

    // Responsive tool popovers
    const [colorAnchor, setColorAnchor] = useState(null);
    const [sizeAnchor, setSizeAnchor] = useState(null);

    const isMobile = useMediaQuery('(max-width: 768px)');

    const localHistoryRef = useRef(localHistory);
    useEffect(() => {
        localHistoryRef.current = localHistory;
    }, [localHistory]);

    useEffect(() => {
        setLocalHistory(initialHistory || []);
    }, [initialHistory]);

    // Draw single normalized stroke/segment on canvas
    const drawNormalizedShape = (stroke) => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx || !stroke) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.clientWidth || (canvas.width / dpr);
        const height = canvas.clientHeight || (canvas.height / dpr);

        const x0 = stroke.x0 * width;
        const y0 = stroke.y0 * height;
        const x1 = stroke.x1 * width;
        const y1 = stroke.y1 * height;
        const size = (stroke.size || 0.005) * width;
        const tool = stroke.tool || (stroke.isEraser ? 'eraser' : 'pen');

        ctx.save();
        ctx.beginPath();

        if (tool === 'eraser' || stroke.isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = stroke.color || '#FF453A';
        }

        ctx.lineWidth = Math.max(1.5, size);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.brushType === 'highlighter' && tool !== 'eraser') {
            ctx.globalAlpha = 0.35;
        } else {
            ctx.globalAlpha = 1.0;
        }

        if (stroke.brushType === 'dashed' && tool !== 'eraser') {
            const dashScale = Math.max(1, width / 1200);
            ctx.setLineDash([8 * dashScale, 10 * dashScale]);
        } else {
            ctx.setLineDash([]);
        }

        if (tool === 'line') {
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
        } else if (tool === 'rectangle') {
            const rectW = x1 - x0;
            const rectH = y1 - y0;
            ctx.strokeRect(x0, y0, rectW, rectH);
        } else if (tool === 'circle') {
            const radius = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
            ctx.arc(x0, y0, radius, 0, 2 * Math.PI);
            ctx.stroke();
        } else {
            // Pen / Eraser smooth curve
            ctx.moveTo(x0, y0);
            if (stroke.cx !== undefined && stroke.cy !== undefined) {
                ctx.quadraticCurveTo(stroke.cx * width, stroke.cy * height, x1, y1);
            } else {
                const midX = (x0 + x1) / 2;
                const midY = (y0 + y1) / 2;
                ctx.quadraticCurveTo(x0, y0, midX, midY);
            }
            ctx.stroke();
        }

        ctx.closePath();
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
    };

    // Redraw entire history buffer
    const redrawHistory = (historyToDraw = null) => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;

        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        const list = historyToDraw || localHistoryRef.current || [];
        list.forEach(stroke => {
            drawNormalizedShape(stroke);
        });
    };

    // ResizeObserver for dynamic High-DPI canvas
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width === 0 || height === 0) return;
                const dpr = window.devicePixelRatio || 1;

                canvas.width = Math.floor(width * dpr);
                canvas.height = Math.floor(height * dpr);
                canvas.style.width = '100%';
                canvas.style.height = '100%';

                const ctx = canvas.getContext('2d');
                ctx.scale(dpr, dpr);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                contextRef.current = ctx;

                redrawHistory();
            }
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // Socket sync listeners
    useEffect(() => {
        if (!socket) return;

        const handleWhiteboardStroke = (data) => {
            if (!canvasRef.current || !contextRef.current || !data) return;
            try {
                drawNormalizedShape(data);
                setLocalHistory(prev => [...prev, data]);
            } catch (err) {
                console.warn("Whiteboard stroke render suppressed:", err);
            }
        };

        const handleWhiteboardState = (state) => {
            if (!Array.isArray(state)) return;
            try {
                setLocalHistory(state);
                setRedoStack([]);
                redrawHistory(state);
            } catch (err) {
                console.warn("Whiteboard state sync suppressed:", err);
            }
        };

        const handleWhiteboardClear = () => {
            try {
                const canvas = canvasRef.current;
                const ctx = contextRef.current;
                if (canvas && ctx) {
                    const dpr = window.devicePixelRatio || 1;
                    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
                }
                setLocalHistory([]);
                setRedoStack([]);
            } catch (err) {
                console.warn("Whiteboard clear suppressed:", err);
            }
        };

        socket.on('whiteboard-stroke', handleWhiteboardStroke);
        socket.on('whiteboard-state', handleWhiteboardState);
        socket.on('whiteboard-clear', handleWhiteboardClear);

        return () => {
            socket.off('whiteboard-stroke', handleWhiteboardStroke);
            socket.off('whiteboard-state', handleWhiteboardState);
            socket.off('whiteboard-clear', handleWhiteboardClear);
        };
    }, [socket]);

    const getPhysicalCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    // Starting a new atomic stroke gesture
    const startDrawing = (e) => {
        const { x, y } = getPhysicalCoordinates(e);
        setIsDrawing(true);
        lastPosRef.current = { x, y };
        startPosRef.current = { x, y };
        currentPosRef.current = { x, y };
        currentStrokeIdRef.current = 'strk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { x, y } = getPhysicalCoordinates(e);
        currentPosRef.current = { x, y };

        const canvas = canvasRef.current;
        if (!canvas) return;

        const width = canvas.clientWidth || 1;
        const height = canvas.clientHeight || 1;
        const activeColor = isEraser ? '#ffffff' : color;
        const activeSize = isEraser ? eraserSize : brushSize;

        if (activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle') {
            redrawHistory();
            const strokePreview = {
                strokeId: currentStrokeIdRef.current,
                tool: activeTool,
                x0: startPosRef.current.x / width,
                y0: startPosRef.current.y / height,
                x1: x / width,
                y1: y / height,
                color: activeColor,
                size: activeSize / width,
                brushType: brushType,
                isEraser: isEraser
            };
            drawNormalizedShape(strokePreview);
            return;
        }

        // Freehand Pen / Eraser
        const { x: x0, y: y0 } = lastPosRef.current;
        const midX = (x0 + x) / 2;
        const midY = (y0 + y) / 2;

        const strokeData = {
            strokeId: currentStrokeIdRef.current,
            tool: activeTool,
            x0: x0 / width,
            y0: y0 / height,
            x1: midX / width,
            y1: midY / height,
            cx: x0 / width,
            cy: y0 / height,
            color: activeColor,
            size: activeSize / width,
            brushType: isEraser ? 'solid' : brushType,
            isEraser: isEraser
        };

        drawNormalizedShape(strokeData);

        if (socket) socket.emit('whiteboard-stroke', strokeData);
        if (onStrokeAdded) onStrokeAdded(strokeData);

        setLocalHistory(prev => [...prev, strokeData]);
        setRedoStack([]);
        lastPosRef.current = { x: midX, y: midY };
    };

    const stopDrawing = () => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (canvas && (activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle')) {
            const width = canvas.clientWidth || 1;
            const height = canvas.clientHeight || 1;
            const activeColor = isEraser ? '#ffffff' : color;
            const activeSize = isEraser ? eraserSize : brushSize;

            const strokeData = {
                strokeId: currentStrokeIdRef.current,
                tool: activeTool,
                x0: startPosRef.current.x / width,
                y0: startPosRef.current.y / height,
                x1: currentPosRef.current.x / width,
                y1: currentPosRef.current.y / height,
                color: activeColor,
                size: activeSize / width,
                brushType: brushType,
                isEraser: isEraser
            };

            drawNormalizedShape(strokeData);
            if (socket) socket.emit('whiteboard-stroke', strokeData);
            if (onStrokeAdded) onStrokeAdded(strokeData);
            setLocalHistory(prev => [...prev, strokeData]);
            setRedoStack([]);
        }

        setIsDrawing(false);
    };

    // Touch Support
    const startDrawingTouch = (e) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const { x, y } = getPhysicalCoordinates(touch);
            setIsDrawing(true);
            lastPosRef.current = { x, y };
            startPosRef.current = { x, y };
            currentPosRef.current = { x, y };
            currentStrokeIdRef.current = 'strk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        }
    };

    const drawTouch = (e) => {
        if (!isDrawing || e.touches.length !== 1) return;
        e.preventDefault();

        const touch = e.touches[0];
        const { x, y } = getPhysicalCoordinates(touch);
        currentPosRef.current = { x, y };

        const canvas = canvasRef.current;
        if (!canvas) return;

        const width = canvas.clientWidth || 1;
        const height = canvas.clientHeight || 1;
        const activeColor = isEraser ? '#ffffff' : color;
        const activeSize = isEraser ? eraserSize : brushSize;

        if (activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle') {
            redrawHistory();
            const strokePreview = {
                strokeId: currentStrokeIdRef.current,
                tool: activeTool,
                x0: startPosRef.current.x / width,
                y0: startPosRef.current.y / height,
                x1: x / width,
                y1: y / height,
                color: activeColor,
                size: activeSize / width,
                brushType: brushType,
                isEraser: isEraser
            };
            drawNormalizedShape(strokePreview);
            return;
        }

        // Freehand Pen / Eraser
        const { x: x0, y: y0 } = lastPosRef.current;
        const midX = (x0 + x) / 2;
        const midY = (y0 + y) / 2;

        const strokeData = {
            strokeId: currentStrokeIdRef.current,
            tool: activeTool,
            x0: x0 / width,
            y0: y0 / height,
            x1: midX / width,
            y1: midY / height,
            cx: x0 / width,
            cy: y0 / height,
            color: activeColor,
            size: activeSize / width,
            brushType: isEraser ? 'solid' : brushType,
            isEraser: isEraser
        };

        drawNormalizedShape(strokeData);

        if (socket) socket.emit('whiteboard-stroke', strokeData);
        if (onStrokeAdded) onStrokeAdded(strokeData);

        setLocalHistory(prev => [...prev, strokeData]);
        setRedoStack([]);
        lastPosRef.current = { x: midX, y: midY };
    };

    // ATOMIC FULL STROKE UNDO
    const handleUndo = () => {
        if (localHistory.length === 0) return;

        const lastItem = localHistory[localHistory.length - 1];
        let remainingHistory = [];
        let poppedGroup = [];

        if (lastItem && lastItem.strokeId) {
            const targetStrokeId = lastItem.strokeId;
            let splitIndex = localHistory.length - 1;
            while (splitIndex >= 0 && localHistory[splitIndex].strokeId === targetStrokeId) {
                splitIndex--;
            }
            remainingHistory = localHistory.slice(0, splitIndex + 1);
            poppedGroup = localHistory.slice(splitIndex + 1);
        } else {
            remainingHistory = localHistory.slice(0, -1);
            poppedGroup = [lastItem];
        }

        setRedoStack(prev => [...prev, poppedGroup]);
        setLocalHistory(remainingHistory);
        redrawHistory(remainingHistory);

        if (socket) {
            socket.emit('whiteboard-sync-full', remainingHistory);
        }
        if (onUndo) onUndo(remainingHistory);
    };

    // ATOMIC FULL STROKE REDO
    const handleRedo = () => {
        if (redoStack.length === 0) return;

        const newRedoStack = [...redoStack];
        const itemsToRestore = newRedoStack.pop();
        const restoredArray = Array.isArray(itemsToRestore) ? itemsToRestore : [itemsToRestore];

        const newHistory = [...localHistory, ...restoredArray];
        setRedoStack(newRedoStack);
        setLocalHistory(newHistory);
        redrawHistory(newHistory);

        if (socket) {
            socket.emit('whiteboard-sync-full', newHistory);
        }
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = contextRef.current;
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

        if (socket) socket.emit('whiteboard-clear');
        setLocalHistory([]);
        setRedoStack([]);
        if (onClearBoard) onClearBoard();
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const expCtx = exportCanvas.getContext('2d');
        
        expCtx.fillStyle = '#FFFFFF';
        expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        expCtx.drawImage(canvas, 0, 0);

        const link = document.createElement('a');
        link.download = `OmniMeet-Whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    };

    const selectTool = (toolName) => {
        setActiveTool(toolName);
        if (toolName === 'eraser') {
            setIsEraser(true);
        } else {
            setIsEraser(false);
        }
    };

    return (
        <Box 
            ref={containerRef}
            sx={{
                width: '100%',
                height: '100%',
                position: 'relative',
                backgroundColor: '#FAFCFF',
                backgroundImage: 'radial-gradient(#E2E8F0 1.5px, transparent 1.5px)',
                backgroundSize: '24px 24px',
                borderRadius: { xs: '16px', md: '24px' },
                overflow: 'hidden',
                boxShadow: '0 20px 50px -10px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.9)',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* FLOATING TOOLS PANEL (Desktop: Pill / Mobile: Responsive Adaptive Grid Box with Collapse) */}
            {isMobile && !isToolsOpenMobile ? (
                <Button
                    onClick={() => setIsToolsOpenMobile(true)}
                    variant="contained"
                    startIcon={<TuneIcon />}
                    sx={{
                        position: 'absolute',
                        top: '12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 100,
                        backgroundColor: 'rgba(255, 255, 255, 0.96)',
                        backdropFilter: 'blur(20px)',
                        color: '#0F172A',
                        borderRadius: '50px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        '&:hover': { backgroundColor: '#FFFFFF' }
                    }}
                >
                    Show Tools
                </Button>
            ) : (
                <Paper
                    elevation={0}
                    sx={{
                        position: 'absolute',
                        top: { xs: '12px', sm: '16px' },
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexWrap: isMobile ? 'wrap' : 'nowrap',
                        gap: { xs: 0.8, sm: 1 },
                        padding: { xs: '10px 14px', sm: '8px 18px' },
                        backgroundColor: 'rgba(255, 255, 255, 0.96)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(226, 232, 240, 0.95)',
                        borderRadius: isMobile ? '22px' : '50px',
                        boxShadow: '0 12px 35px -5px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.9)',
                        width: isMobile ? '90%' : 'auto',
                        maxWidth: isMobile ? '380px' : '96%',
                        height: 'auto',
                        boxSizing: 'border-box'
                    }}
                >
                    {/* TOOL SELECTORS */}
                    <Tooltip title="Pen Tool (P)">
                        <IconButton 
                            size="small" 
                            onClick={() => selectTool('pen')}
                            sx={{
                                color: activeTool === 'pen' && !isEraser ? '#FFFFFF' : '#475569',
                                backgroundColor: activeTool === 'pen' && !isEraser ? '#0F172A' : 'transparent',
                                borderRadius: '50%',
                                p: { xs: 0.9, sm: 1 },
                                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                '&:hover': {
                                    backgroundColor: activeTool === 'pen' && !isEraser ? '#1E293B' : 'rgba(241, 245, 249, 0.9)',
                                    transform: 'scale(1.05)'
                                }
                            }}
                        >
                            <PenToolIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Line Tool (L)">
                        <IconButton 
                            size="small" 
                            onClick={() => selectTool('line')}
                            sx={{
                                color: activeTool === 'line' ? '#FFFFFF' : '#475569',
                                backgroundColor: activeTool === 'line' ? '#0F172A' : 'transparent',
                                borderRadius: '50%',
                                p: { xs: 0.9, sm: 1 },
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: activeTool === 'line' ? '#1E293B' : 'rgba(241, 245, 249, 0.9)',
                                    transform: 'scale(1.05)'
                                }
                            }}
                        >
                            <LineToolIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Rectangle (R)">
                        <IconButton 
                            size="small" 
                            onClick={() => selectTool('rectangle')}
                            sx={{
                                color: activeTool === 'rectangle' ? '#FFFFFF' : '#475569',
                                backgroundColor: activeTool === 'rectangle' ? '#0F172A' : 'transparent',
                                borderRadius: '50%',
                                p: { xs: 0.9, sm: 1 },
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: activeTool === 'rectangle' ? '#1E293B' : 'rgba(241, 245, 249, 0.9)',
                                    transform: 'scale(1.05)'
                                }
                            }}
                        >
                            <RectToolIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Circle (C)">
                        <IconButton 
                            size="small" 
                            onClick={() => selectTool('circle')}
                            sx={{
                                color: activeTool === 'circle' ? '#FFFFFF' : '#475569',
                                backgroundColor: activeTool === 'circle' ? '#0F172A' : 'transparent',
                                borderRadius: '50%',
                                p: { xs: 0.9, sm: 1 },
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: activeTool === 'circle' ? '#1E293B' : 'rgba(241, 245, 249, 0.9)',
                                    transform: 'scale(1.05)'
                                }
                            }}
                        >
                            <CircleToolIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Precision Eraser (E)">
                        <IconButton 
                            size="small" 
                            onClick={() => selectTool('eraser')}
                            sx={{
                                color: isEraser ? '#FFFFFF' : '#475569',
                                backgroundColor: isEraser ? '#FF453A' : 'transparent',
                                borderRadius: '50%',
                                p: { xs: 0.9, sm: 1 },
                                boxShadow: isEraser ? '0 4px 12px rgba(255, 69, 58, 0.35)' : 'none',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: isEraser ? '#E0382E' : 'rgba(241, 245, 249, 0.9)',
                                    transform: 'scale(1.05)'
                                }
                            }}
                        >
                            <EraserToolIcon />
                        </IconButton>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem sx={{ mx: { xs: 0.2, sm: 0.6 }, borderColor: 'rgba(226, 232, 240, 0.9)' }} />

                    {/* COLOR PALETTE */}
                    {!isMobile ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {PRESET_COLORS.map(c => (
                                <Box
                                    key={c}
                                    onClick={() => { setColor(c); setIsEraser(false); if(activeTool === 'eraser') setActiveTool('pen'); }}
                                    sx={{
                                        width: color === c && !isEraser ? 22 : 18,
                                        height: color === c && !isEraser ? 22 : 18,
                                        borderRadius: '50%',
                                        backgroundColor: c,
                                        cursor: 'pointer',
                                        border: color === c && !isEraser ? '2.5px solid #0F172A' : '1.5px solid rgba(0,0,0,0.1)',
                                        transform: color === c && !isEraser ? 'scale(1.15)' : 'scale(1)',
                                        transition: 'all 0.2s ease',
                                        boxShadow: color === c && !isEraser ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                                    }}
                                />
                            ))}
                        </Box>
                    ) : (
                        <Tooltip title="Palette">
                            <IconButton 
                                size="small" 
                                onClick={(e) => setColorAnchor(e.currentTarget)}
                                sx={{ p: 0.9 }}
                            >
                                <Box sx={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: isEraser ? '#cbd5e1' : color, border: '2px solid #0f172a' }} />
                            </IconButton>
                        </Tooltip>
                    )}

                    {/* Mobile Color Popover */}
                    <Popover
                        open={Boolean(colorAnchor)}
                        anchorEl={colorAnchor}
                        onClose={() => setColorAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                        PaperProps={{
                            sx: { p: 1.5, borderRadius: '18px', display: 'flex', gap: 1, backgroundColor: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', boxShadow: '0 15px 40px rgba(0,0,0,0.15)' }
                        }}
                    >
                        {PRESET_COLORS.map(c => (
                            <Box
                                key={c}
                                onClick={() => { setColor(c); setIsEraser(false); if(activeTool === 'eraser') setActiveTool('pen'); setColorAnchor(null); }}
                                sx={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    backgroundColor: c,
                                    cursor: 'pointer',
                                    border: color === c && !isEraser ? '3px solid #0F172A' : '1px solid rgba(0,0,0,0.1)'
                                }}
                            />
                        ))}
                    </Popover>

                    <Divider orientation="vertical" flexItem sx={{ mx: { xs: 0.2, sm: 0.6 }, borderColor: 'rgba(226, 232, 240, 0.9)' }} />

                    {/* STROKE SIZE / SLIDER */}
                    {!isMobile ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 85 }}>
                            <Slider
                                size="small"
                                min={1}
                                max={isEraser ? 60 : 25}
                                value={isEraser ? eraserSize : brushSize}
                                onChange={(e, val) => isEraser ? setEraserSize(val) : setBrushSize(val)}
                                sx={{
                                    color: isEraser ? '#FF453A' : '#0F172A',
                                    '& .MuiSlider-thumb': { width: 14, height: 14, backgroundColor: '#FFFFFF', border: '2px solid currentColor' }
                                }}
                            />
                        </Box>
                    ) : (
                        <Tooltip title="Stroke Width">
                            <IconButton size="small" onClick={(e) => setSizeAnchor(e.currentTarget)} sx={{ p: 0.9, color: '#475569' }}>
                                <BrushIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}

                    {/* Mobile Size Popover */}
                    <Popover
                        open={Boolean(sizeAnchor)}
                        anchorEl={sizeAnchor}
                        onClose={() => setSizeAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        PaperProps={{ sx: { p: 2, width: 180, borderRadius: '18px' } }}
                    >
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
                            Size: {isEraser ? eraserSize : brushSize}px
                        </Typography>
                        <Slider
                            size="small"
                            min={1}
                            max={isEraser ? 60 : 30}
                            value={isEraser ? eraserSize : brushSize}
                            onChange={(e, val) => isEraser ? setEraserSize(val) : setBrushSize(val)}
                            sx={{ color: isEraser ? '#FF453A' : '#0F172A' }}
                        />
                    </Popover>

                    <Divider orientation="vertical" flexItem sx={{ mx: { xs: 0.2, sm: 0.6 }, borderColor: 'rgba(226, 232, 240, 0.9)' }} />

                    {/* ATOMIC UNDO / REDO CONTROLS */}
                    <Tooltip title="Undo Full Stroke (Ctrl+Z)">
                        <span>
                            <IconButton 
                                size="small" 
                                onClick={handleUndo} 
                                disabled={localHistory.length === 0}
                                sx={{ color: '#475569', p: { xs: 0.9, sm: 1 }, '&:disabled': { opacity: 0.3 } }}
                            >
                                <UndoIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Tooltip title="Redo Full Stroke (Ctrl+Y)">
                        <span>
                            <IconButton 
                                size="small" 
                                onClick={handleRedo} 
                                disabled={redoStack.length === 0}
                                sx={{ color: '#475569', p: { xs: 0.9, sm: 1 }, '&:disabled': { opacity: 0.3 } }}
                            >
                                <RedoToolIcon />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem sx={{ mx: { xs: 0.2, sm: 0.6 }, borderColor: 'rgba(226, 232, 240, 0.9)' }} />

                    {/* CLEAR BOARD */}
                    <Tooltip title="Clear Whiteboard">
                        <IconButton 
                            size="small" 
                            onClick={() => setClearDialogOpen(true)}
                            sx={{ color: '#EF4444', p: { xs: 0.9, sm: 1 }, '&:hover': { backgroundColor: '#FEE2E2' } }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    {/* EXPORT PNG */}
                    <Tooltip title="Export High-Res PNG">
                        <IconButton 
                            size="small" 
                            onClick={handleDownload}
                            sx={{ color: '#0284C7', p: { xs: 0.9, sm: 1 }, '&:hover': { backgroundColor: '#E0F2FE' } }}
                        >
                            <DownloadIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    {/* Mobile Collapse Button */}
                    {isMobile && (
                        <Tooltip title="Minimize Tools Panel">
                            <IconButton 
                                size="small" 
                                onClick={() => setIsToolsOpenMobile(false)}
                                sx={{ color: '#64748B', p: 0.9, '&:hover': { backgroundColor: '#F1F5F9' } }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Paper>
            )}

            {/* HIGH RESOLUTION VECTOR CANVAS */}
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawingTouch}
                onTouchMove={drawTouch}
                onTouchEnd={stopDrawing}
                style={{
                    width: '100%',
                    height: '100%',
                    touchAction: 'none',
                    cursor: isEraser ? 'crosshair' : activeTool === 'pen' ? 'crosshair' : 'default',
                    display: 'block'
                }}
            />

            {/* CLEAR CONFIRMATION DIALOG */}
            <Dialog
                open={clearDialogOpen}
                onClose={() => setClearDialogOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: '24px',
                        p: 1.5,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.15)'
                    }
                }}
            >
                <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#0F172A' }}>
                    Clear Whiteboard Canvas?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: '#64748B', fontSize: '0.95rem' }}>
                        This will completely erase all drawing paths and shapes for everyone in the room. This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button 
                        onClick={() => setClearDialogOpen(false)} 
                        sx={{ color: '#64748B', textTransform: 'none', fontWeight: 700, borderRadius: '12px' }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={() => { handleClear(); setClearDialogOpen(false); }} 
                        variant="contained" 
                        sx={{ 
                            backgroundColor: '#FF453A', 
                            color: '#fff', 
                            textTransform: 'none', 
                            fontWeight: 800, 
                            borderRadius: '12px',
                            boxShadow: '0 4px 14px rgba(255, 69, 58, 0.4)',
                            '&:hover': { backgroundColor: '#E0382E' }
                        }}
                    >
                        Clear Everything
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
