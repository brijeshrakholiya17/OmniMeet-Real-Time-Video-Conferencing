import React, { useEffect, useRef, useState } from 'react';
import { Paper, IconButton, Slider, Tooltip, Divider, Box, Typography, useMediaQuery, Popover, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import BrushIcon from '@mui/icons-material/Brush';
import UndoIcon from '@mui/icons-material/Undo';
import CloseIcon from '@mui/icons-material/Close';

// Custom SVG Icons for Drawing Tools
const PenToolIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.5 7.5" />
    </svg>
);

const LineToolIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="4" y1="20" x2="20" y2="4" />
    </svg>
);

const RectToolIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
);

const CircleToolIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="12" cy="12" r="8.5" />
    </svg>
);

const EraserToolIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.24 7.56l4.24 4.24c.78.78.78 2.05 0 2.83L13.59 21H21v-2h-3.59l4.24-4.24c1.56-1.56 1.56-4.09 0-5.66l-5.66-5.66c-1.56-1.56-4.09-1.56-5.66 0L2.24 12.03c-.78.78-.78 2.05 0 2.83L6.5 19.1c.78.78 2.05.78 2.83 0l6.91-6.91-2.83-2.83-6.91 6.91-2.83-2.83 7.07-7.07c1.56-1.56 4.09-1.56 5.66 0z" />
    </svg>
);

const RedoToolIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>
    </svg>
);

const PRESET_COLORS = ['#FF453A', '#00F2FE', '#00F5D4', '#FFD166', '#7B2CBF', '#FFFFFF', '#000000'];

export default function Whiteboard({ socket, room, initialHistory, onStrokeAdded, onClearBoard, onUndo, onClose }) {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const containerRef = useRef(null);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const startPosRef = useRef({ x: 0, y: 0 });
    const currentPosRef = useRef({ x: 0, y: 0 });

    const [isDrawing, setIsDrawing] = useState(false);
    const [activeTool, setActiveTool] = useState('pen'); // 'pen', 'line', 'rectangle', 'circle', 'eraser'
    const [color, setColor] = useState('#FF453A');
    const [brushSize, setBrushSize] = useState(5);
    const [eraserSize, setEraserSize] = useState(25);
    const [isEraser, setIsEraser] = useState(false);
    const [brushType, setBrushType] = useState('solid'); // 'solid', 'highlighter', 'dashed'
    const [localHistory, setLocalHistory] = useState(initialHistory || []);
    const [redoStack, setRedoStack] = useState([]);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);

    // Mobile popovers anchor states
    const [colorAnchor, setColorAnchor] = useState(null);
    const [sizeAnchor, setSizeAnchor] = useState(null);

    const isMobile = useMediaQuery('(max-width: 768px)');

    // Sync ref with state so ResizeObserver can access the latest state without observer re-registration
    const localHistoryRef = useRef(localHistory);
    useEffect(() => {
        localHistoryRef.current = localHistory;
    }, [localHistory]);

    // Keep state in sync with parent updates
    useEffect(() => {
        setLocalHistory(initialHistory || []);
    }, [initialHistory]);

    // Helper to draw physical normalized shapes with composite operation support
    const drawNormalizedShape = (stroke) => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;

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

        ctx.lineWidth = Math.max(1, size);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.brushType === 'highlighter' && tool !== 'eraser') {
            ctx.globalAlpha = 0.4;
        } else {
            ctx.globalAlpha = 1.0;
        }

        if (stroke.brushType === 'dashed' && tool !== 'eraser') {
            const dashScale = width / 1920;
            ctx.setLineDash([10 * dashScale, 15 * dashScale]);
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
            // Pen / Eraser freehand curve
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

    // Redraw complete history cache
    const redrawHistory = () => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;

        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        const historyToDraw = localHistoryRef.current || [];
        historyToDraw.forEach(stroke => {
            drawNormalizedShape(stroke);
        });
    };

    // Attach ResizeObserver to canvas parent container to adjust resolution dynamically with High-DPI scaling
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
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

    // Socket listeners for real-time syncing
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
                const canvas = canvasRef.current;
                const ctx = contextRef.current;
                if (canvas && ctx) {
                    const dpr = window.devicePixelRatio || 1;
                    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
                    state.forEach(stroke => {
                        drawNormalizedShape(stroke);
                    });
                }
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

    // Drawing coordinates resolver
    const getPhysicalCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    // Drawing Trigger Methods
    const startDrawing = (e) => {
        const { x, y } = getPhysicalCoordinates(e);
        setIsDrawing(true);
        lastPosRef.current = { x, y };
        startPosRef.current = { x, y };
        currentPosRef.current = { x, y };
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

    const handleUndo = () => {
        if (localHistory.length === 0) return;
        const newHistory = [...localHistory];
        const poppedStroke = newHistory.pop();
        setRedoStack(prev => [...prev, poppedStroke]);
        setLocalHistory(newHistory);

        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (canvas && ctx) {
            const dpr = window.devicePixelRatio || 1;
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            newHistory.forEach(stroke => {
                drawNormalizedShape(stroke);
            });
        }

        if (socket) socket.emit('whiteboard-sync-full', newHistory);
        if (onUndo) onUndo(newHistory);
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const newRedoStack = [...redoStack];
        const strokeToRedo = newRedoStack.pop();
        setRedoStack(newRedoStack);

        const updatedHistory = [...localHistory, strokeToRedo];
        setLocalHistory(updatedHistory);

        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (canvas && ctx) {
            drawNormalizedShape(strokeToRedo);
        }

        if (socket) {
            socket.emit('whiteboard-stroke', strokeToRedo);
            socket.emit('whiteboard-sync-full', updatedHistory);
        }
    };

    const exportPNG = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);

        const link = document.createElement('a');
        link.download = `whiteboard-${new Date().getTime()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const selectTool = (toolName) => {
        setActiveTool(toolName);
        if (toolName === 'eraser') {
            setIsEraser(true);
        } else {
            setIsEraser(false);
        }
    };

    const activeSize = isEraser ? eraserSize : brushSize;

    return (
        <Box sx={{
            position: 'relative',
            flex: 1,
            minHeight: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#121212',
            padding: isMobile ? '8px' : '20px',
            boxSizing: 'border-box',
            overflow: 'hidden',
            touchAction: 'none'
        }}>
            {/* Top Bar Close Action Button */}
            <Box sx={{
                position: 'absolute',
                top: isMobile ? '12px' : '20px',
                right: isMobile ? '12px' : '20px',
                zIndex: 70,
                pointerEvents: 'none'
            }}>
                <IconButton
                    onClick={onClose}
                    sx={{
                        pointerEvents: 'auto',
                        backgroundColor: 'rgba(28, 28, 30, 0.95)',
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        minWidth: 44,
                        minHeight: 44,
                        '&:hover': { backgroundColor: '#EB5545', color: 'white' }
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* ResizeObserver Canvas parent container */}
            <Box ref={containerRef} sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                touchAction: 'none'
            }}>
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
                        display: 'block',
                        cursor: activeTool === 'eraser' ? 'cell' : 'crosshair',
                        touchAction: 'none'
                    }}
                />

                {/* Floating Glassmorphism Toolbar Container */}
                <Paper
                    elevation={12}
                    sx={{
                        position: 'absolute',
                        bottom: isMobile ? '14px' : '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 60,
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '4px' : '10px',
                        padding: isMobile ? '6px 10px' : '8px 18px',
                        borderRadius: '32px',
                        backgroundColor: 'rgba(18, 24, 36, 0.88)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), inset 0 1px 2px rgba(255, 255, 255, 0.15)',
                        maxWidth: isMobile ? '96vw' : '90vw',
                        overflowX: isMobile ? 'auto' : 'visible',
                        whiteSpace: 'nowrap',
                        '&::-webkit-scrollbar': { display: 'none' }
                    }}
                >
                    {/* Tool Selectors */}
                    <Tooltip title="Freehand Pen" placement="top">
                        <IconButton
                            onClick={() => selectTool('pen')}
                            sx={{
                                minWidth: 44,
                                minHeight: 44,
                                color: activeTool === 'pen' ? '#FF453A' : 'rgba(255, 255, 255, 0.75)',
                                backgroundColor: activeTool === 'pen' ? 'rgba(255, 69, 58, 0.18)' : 'transparent',
                                border: activeTool === 'pen' ? '1px solid rgba(255, 69, 58, 0.4)' : '1px solid transparent',
                                borderRadius: '16px',
                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                            }}
                        >
                            <PenToolIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Line Tool" placement="top">
                        <IconButton
                            onClick={() => selectTool('line')}
                            sx={{
                                minWidth: 44,
                                minHeight: 44,
                                color: activeTool === 'line' ? '#00F2FE' : 'rgba(255, 255, 255, 0.75)',
                                backgroundColor: activeTool === 'line' ? 'rgba(0, 242, 254, 0.18)' : 'transparent',
                                border: activeTool === 'line' ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid transparent',
                                borderRadius: '16px',
                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                            }}
                        >
                            <LineToolIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Rectangle Tool" placement="top">
                        <IconButton
                            onClick={() => selectTool('rectangle')}
                            sx={{
                                minWidth: 44,
                                minHeight: 44,
                                color: activeTool === 'rectangle' ? '#00F5D4' : 'rgba(255, 255, 255, 0.75)',
                                backgroundColor: activeTool === 'rectangle' ? 'rgba(0, 245, 212, 0.18)' : 'transparent',
                                border: activeTool === 'rectangle' ? '1px solid rgba(0, 245, 212, 0.4)' : '1px solid transparent',
                                borderRadius: '16px',
                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                            }}
                        >
                            <RectToolIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Circle Tool" placement="top">
                        <IconButton
                            onClick={() => selectTool('circle')}
                            sx={{
                                minWidth: 44,
                                minHeight: 44,
                                color: activeTool === 'circle' ? '#FFD166' : 'rgba(255, 255, 255, 0.75)',
                                backgroundColor: activeTool === 'circle' ? 'rgba(255, 209, 102, 0.18)' : 'transparent',
                                border: activeTool === 'circle' ? '1px solid rgba(255, 209, 102, 0.4)' : '1px solid transparent',
                                borderRadius: '16px',
                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                            }}
                        >
                            <CircleToolIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Eraser Tool" placement="top">
                        <IconButton
                            onClick={() => selectTool('eraser')}
                            sx={{
                                minWidth: 44,
                                minHeight: 44,
                                color: activeTool === 'eraser' ? '#FF453A' : 'rgba(255, 255, 255, 0.75)',
                                backgroundColor: activeTool === 'eraser' ? 'rgba(255, 69, 58, 0.18)' : 'transparent',
                                border: activeTool === 'eraser' ? '1px solid rgba(255, 69, 58, 0.4)' : '1px solid transparent',
                                borderRadius: '16px',
                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                            }}
                        >
                            <EraserToolIcon />
                        </IconButton>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', height: '24px', alignSelf: 'center', mx: 0.5 }} />

                    {/* Color Picker & Palette */}
                    {!isMobile ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {PRESET_COLORS.map(c => (
                                <Box
                                    key={c}
                                    onClick={() => { setColor(c); if (activeTool === 'eraser') setActiveTool('pen'); }}
                                    sx={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        backgroundColor: c,
                                        cursor: 'pointer',
                                        border: color === c && activeTool !== 'eraser' ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                                        boxShadow: color === c && activeTool !== 'eraser' ? '0 0 8px ' + c : 'none',
                                        transition: 'transform 0.2s',
                                        '&:hover': { transform: 'scale(1.15)' }
                                    }}
                                />
                            ))}
                            <Box sx={{ position: 'relative', width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => { setColor(e.target.value); if (activeTool === 'eraser') setActiveTool('pen'); }}
                                    style={{ position: 'absolute', top: '-5px', left: '-5px', width: '32px', height: '32px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                                />
                            </Box>
                        </Box>
                    ) : (
                        <Tooltip title="Color Palette" placement="top">
                            <IconButton
                                onClick={(e) => setColorAnchor(e.currentTarget)}
                                sx={{
                                    minWidth: 44,
                                    minHeight: 44,
                                    color: color,
                                    borderRadius: '16px',
                                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                                }}
                            >
                                <Box sx={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: color, border: '2px solid #ffffff' }} />
                            </IconButton>
                        </Tooltip>
                    )}

                    {/* Popover for Mobile Color Selection */}
                    <Popover
                        open={Boolean(colorAnchor)}
                        anchorEl={colorAnchor}
                        onClose={() => setColorAnchor(null)}
                        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        PaperProps={{
                            sx: {
                                padding: '12px',
                                borderRadius: '20px',
                                backgroundColor: 'rgba(20, 24, 33, 0.95)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'center'
                            }
                        }}
                    >
                        {PRESET_COLORS.map(c => (
                            <Box
                                key={c}
                                onClick={() => { setColor(c); if (activeTool === 'eraser') setActiveTool('pen'); setColorAnchor(null); }}
                                sx={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    backgroundColor: c,
                                    cursor: 'pointer',
                                    border: color === c ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                                    boxShadow: color === c ? '0 0 10px ' + c : 'none'
                                }}
                            />
                        ))}
                        <Box sx={{ position: 'relative', width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => { setColor(e.target.value); if (activeTool === 'eraser') setActiveTool('pen'); }}
                                style={{ position: 'absolute', top: '-5px', left: '-5px', width: '38px', height: '38px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                            />
                        </Box>
                    </Popover>

                    <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', height: '24px', alignSelf: 'center', mx: 0.5 }} />

                    {/* Stroke Width Slider / Popover */}
                    {!isMobile ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100px', px: 1 }}>
                            <Slider
                                size="small"
                                value={activeSize}
                                onChange={(e, val) => isEraser ? setEraserSize(val) : setBrushSize(val)}
                                min={1}
                                max={isEraser ? 100 : 30}
                                sx={{
                                    color: '#FF453A',
                                    '& .MuiSlider-thumb': {
                                        width: 12,
                                        height: 12,
                                        boxShadow: '0 0 8px rgba(255, 69, 58, 0.5)'
                                    }
                                }}
                            />
                        </Box>
                    ) : (
                        <Tooltip title="Stroke Width" placement="top">
                            <IconButton
                                onClick={(e) => setSizeAnchor(e.currentTarget)}
                                sx={{
                                    minWidth: 44,
                                    minHeight: 44,
                                    color: 'white',
                                    borderRadius: '16px',
                                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                                }}
                            >
                                <BrushIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}

                    {/* Popover for Mobile Stroke Width */}
                    <Popover
                        open={Boolean(sizeAnchor)}
                        anchorEl={sizeAnchor}
                        onClose={() => setSizeAnchor(null)}
                        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        PaperProps={{
                            sx: {
                                padding: '16px 20px',
                                borderRadius: '20px',
                                backgroundColor: 'rgba(20, 24, 33, 0.95)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                minWidth: '200px'
                            }
                        }}
                    >
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', display: 'block', mb: 1 }}>
                            Stroke Width: {activeSize}px
                        </Typography>
                        <Slider
                            size="small"
                            value={activeSize}
                            onChange={(e, val) => isEraser ? setEraserSize(val) : setBrushSize(val)}
                            min={1}
                            max={isEraser ? 100 : 30}
                            sx={{
                                color: '#FF453A',
                                '& .MuiSlider-thumb': {
                                    width: 14,
                                    height: 14,
                                    boxShadow: '0 0 10px rgba(255, 69, 58, 0.5)'
                                }
                            }}
                        />
                    </Popover>

                    <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', height: '24px', alignSelf: 'center', mx: 0.5 }} />

                    {/* Actions: Undo, Redo, Clear Board, Export PNG */}
                    <Tooltip title="Undo" placement="top">
                        <IconButton
                            onClick={handleUndo}
                            disabled={localHistory.length === 0}
                            sx={{
                                minWidth: 44,
                                minHeight: 44,
                                color: localHistory.length > 0 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.25)',
                                borderRadius: '16px',
                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                            }}
                        >
                            <UndoIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Redo" placement="top">
                        <IconButton
                            onClick={handleRedo}
                            disabled={redoStack.length === 0}
                            sx={{
                                minWidth: 44,
                                minHeight: 44,
                                color: redoStack.length > 0 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.25)',
                                borderRadius: '16px',
                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                            }}
                        >
                            <RedoToolIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Clear Board" placement="top">
                        <IconButton
                            onClick={() => setClearDialogOpen(true)}
                            sx={{
                                minWidth: 44,
                                minHeight: 44,
                                color: '#FF453A',
                                borderRadius: '16px',
                                '&:hover': { backgroundColor: 'rgba(255, 69, 58, 0.15)' }
                            }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Export PNG" placement="top">
                        <IconButton
                            onClick={exportPNG}
                            sx={{
                                minWidth: 44,
                                minHeight: 44,
                                color: 'rgba(255, 255, 255, 0.85)',
                                borderRadius: '16px',
                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                            }}
                        >
                            <DownloadIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Paper>
            </Box>

            {/* Clear Board Safeguard Confirmation Dialog */}
            <Dialog
                open={clearDialogOpen}
                onClose={() => setClearDialogOpen(false)}
                PaperProps={{
                    sx: {
                        backgroundColor: 'rgba(20, 24, 33, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        borderRadius: '24px',
                        padding: '8px'
                    }
                }}
            >
                <DialogTitle sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 'bold', color: '#FF453A' }}>
                    Clear Whiteboard?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem' }}>
                        Are you sure you want to clear the entire whiteboard? This action will erase all drawing strokes for all participants in the meeting room.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ padding: '16px' }}>
                    <Button onClick={() => setClearDialogOpen(false)} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => { handleClear(); setClearDialogOpen(false); }}
                        variant="contained"
                        sx={{
                            backgroundColor: '#FF453A',
                            '&:hover': { backgroundColor: '#ff2d21' },
                            borderRadius: '12px',
                            fontWeight: 'bold'
                        }}
                    >
                        Clear Canvas
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
