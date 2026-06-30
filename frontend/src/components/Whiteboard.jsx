import React, { useEffect, useRef, useState } from 'react';
import { Paper, IconButton, Slider, Tooltip, Divider, Box, Typography, useMediaQuery, Collapse } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import BrushIcon from '@mui/icons-material/Brush';
import UndoIcon from '@mui/icons-material/Undo';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';

const EraserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.24 7.56l4.24 4.24c.78.78.78 2.05 0 2.83L13.59 21H21v-2h-3.59l4.24-4.24c1.56-1.56 1.56-4.09 0-5.66l-5.66-5.66c-1.56-1.56-4.09-1.56-5.66 0L2.24 12.03c-.78.78-.78 2.05 0 2.83L6.5 19.1c.78.78 2.05.78 2.83 0l6.91-6.91-2.83-2.83-6.91 6.91-2.83-2.83 7.07-7.07c1.56-1.56 4.09-1.56 5.66 0z" />
    </svg>
);

export default function Whiteboard({ socket, room, initialHistory, onStrokeAdded, onClearBoard, onUndo, onClose }) {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const containerRef = useRef(null);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const hideTimeoutRef = useRef(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const [eraserSize, setEraserSize] = useState(15);
    const [isEraser, setIsEraser] = useState(false);
    const [brushType, setBrushType] = useState('solid'); // 'solid', 'highlighter', 'dashed'
    const [isToolbarOpen, setIsToolbarOpen] = useState(true);
    const [localHistory, setLocalHistory] = useState(initialHistory || []);

    const isMobileHeight = useMediaQuery('(max-height: 650px)');

    // Sync ref with state so ResizeObserver can access the latest state without observer re-registration
    const localHistoryRef = useRef(localHistory);
    useEffect(() => {
        localHistoryRef.current = localHistory;
    }, [localHistory]);

    // Keep state in sync with parent updates (like other clients Undoing)
    useEffect(() => {
        setLocalHistory(initialHistory || []);
    }, [initialHistory]);

    // Clean up timeouts on unmount
    useEffect(() => {
        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

    // Helper to draw a line segment using physical local coordinates
    const drawPhysicalLine = (x0, y0, x1, y1, strokeColor, size, strokeType) => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;

        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = size;

        // Brush Styles
        if (strokeType === 'highlighter') {
            ctx.globalAlpha = 0.4;
        } else {
            ctx.globalAlpha = 1.0;
        }

        if (strokeType === 'dashed') {
            const dashScale = canvas.width / 1920;
            ctx.setLineDash([10 * dashScale, 15 * dashScale]);
        } else {
            ctx.setLineDash([]);
        }

        ctx.stroke();
        ctx.closePath();

        // Restore context state
        ctx.globalAlpha = 1.0;
        ctx.setLineDash([]);
    };

    // Helper to draw normalized coordinates (scaled to current local resolution)
    const drawNormalizedLine = (nx0, ny0, nx1, ny1, strokeColor, nSize, strokeType) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const x0 = nx0 * canvas.width;
        const y0 = ny0 * canvas.height;
        const x1 = nx1 * canvas.width;
        const y1 = ny1 * canvas.height;
        const size = nSize * canvas.width;

        drawPhysicalLine(x0, y0, x1, y1, strokeColor, Math.max(1, size), strokeType);
    };

    // Clear and redraw all strokes from cache (e.g. during resize or undo)
    const redrawHistory = () => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const historyToDraw = localHistoryRef.current || [];
        historyToDraw.forEach(stroke => {
            drawNormalizedLine(stroke.x0, stroke.y0, stroke.x1, stroke.y1, stroke.color, stroke.size, stroke.brushType);
        });
    };

    // Attach ResizeObserver to canvas parent container to adjust resolution dynamically
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
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

    // Socket listeners for real time syncing
    useEffect(() => {
        if (!socket) return;

        const handleWhiteboardStroke = (data) => {
            drawNormalizedLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.brushType);
            setLocalHistory(prev => [...prev, data]);
        };

        const handleWhiteboardState = (state) => {
            setLocalHistory(state);
            // Clear and repaint with new history state
            const canvas = canvasRef.current;
            const ctx = contextRef.current;
            if (canvas && ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                state.forEach(stroke => {
                    drawNormalizedLine(stroke.x0, stroke.y0, stroke.x1, stroke.y1, stroke.color, stroke.size, stroke.brushType);
                });
            }
        };

        const handleWhiteboardClear = () => {
            const canvas = canvasRef.current;
            const ctx = contextRef.current;
            if (canvas && ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            setLocalHistory([]);
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
        // Clear any auto-hide timeout when drawing starts
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        // Set new auto-hide timer
        hideTimeoutRef.current = setTimeout(() => {
            setIsToolbarOpen(false);
        }, 2000);

        const { x, y } = getPhysicalCoordinates(e);
        setIsDrawing(true);
        lastPosRef.current = { x, y };
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { x, y } = getPhysicalCoordinates(e);
        const { x: x0, y: y0 } = lastPosRef.current;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const activeColor = isEraser ? '#ffffff' : color;
        const activeSize = isEraser ? eraserSize : brushSize;
        const activeBrushType = isEraser ? 'solid' : brushType;

        drawPhysicalLine(x0, y0, x, y, activeColor, activeSize, activeBrushType);

        const strokeData = {
            x0: x0 / canvas.width,
            y0: y0 / canvas.height,
            x1: x / canvas.width,
            y1: y / canvas.height,
            color: activeColor,
            size: activeSize / canvas.width,
            brushType: activeBrushType
        };

        if (socket) {
            socket.emit('whiteboard-stroke', strokeData);
        }
        if (onStrokeAdded) {
            onStrokeAdded(strokeData);
        }

        setLocalHistory(prev => [...prev, strokeData]);
        lastPosRef.current = { x, y };
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    // Touch Support
    const startDrawingTouch = (e) => {
        if (e.touches.length === 1) {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
            hideTimeoutRef.current = setTimeout(() => {
                setIsToolbarOpen(false);
            }, 2000);

            const touch = e.touches[0];
            const { x, y } = getPhysicalCoordinates(touch);
            setIsDrawing(true);
            lastPosRef.current = { x, y };
        }
    };

    const drawTouch = (e) => {
        if (!isDrawing || e.touches.length !== 1) return;
        e.preventDefault();

        const touch = e.touches[0];
        const { x, y } = getPhysicalCoordinates(touch);
        const { x: x0, y: y0 } = lastPosRef.current;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const activeColor = isEraser ? '#ffffff' : color;
        const activeSize = isEraser ? eraserSize : brushSize;
        const activeBrushType = isEraser ? 'solid' : brushType;

        drawPhysicalLine(x0, y0, x, y, activeColor, activeSize, activeBrushType);

        const strokeData = {
            x0: x0 / canvas.width,
            y0: y0 / canvas.height,
            x1: x / canvas.width,
            y1: y / canvas.height,
            color: activeColor,
            size: activeSize / canvas.width,
            brushType: activeBrushType
        };

        if (socket) {
            socket.emit('whiteboard-stroke', strokeData);
        }
        if (onStrokeAdded) {
            onStrokeAdded(strokeData);
        }

        setLocalHistory(prev => [...prev, strokeData]);
        lastPosRef.current = { x, y };
    };

    // Toolbar logic handlers
    const handleColorClick = (hex) => {
        setColor(hex);
        setIsEraser(false);
    };

    const handleEraserClick = () => {
        setIsEraser(true);
    };

    const handleBrushClick = () => {
        setIsEraser(false);
    };

    const handleSizeChange = (val) => {
        if (isEraser) {
            setEraserSize(val);
        } else {
            setBrushSize(val);
        }
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = contextRef.current;
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (socket) {
            socket.emit('whiteboard-clear');
        }
        setLocalHistory([]);
        if (onClearBoard) {
            onClearBoard();
        }
    };

    const handleUndo = () => {
        if (localHistory.length === 0) return;
        const newHistory = [...localHistory];
        newHistory.pop();
        setLocalHistory(newHistory);

        // Repaint locally immediately
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            newHistory.forEach(stroke => {
                drawNormalizedLine(stroke.x0, stroke.y0, stroke.x1, stroke.y1, stroke.color, stroke.size, stroke.brushType);
            });
        }

        // Sync with socket
        if (socket) {
            socket.emit('whiteboard-sync-full', newHistory);
        }
        if (onUndo) {
            onUndo(newHistory);
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

    const activeSize = isEraser ? eraserSize : brushSize;

    return (
        <Box sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#121212',
            padding: '20px',
            boxSizing: 'border-box'
        }}>
            {/* Header Overlay Controls (Always Visible) */}
            <Box sx={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                right: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 60,
                pointerEvents: 'none'
            }}>
                <IconButton
                    onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                    sx={{
                        pointerEvents: 'auto',
                        backgroundColor: 'rgba(28, 28, 30, 0.95)',
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' }
                    }}
                >
                    <MoreVertIcon />
                </IconButton>

                <IconButton
                    onClick={onClose}
                    sx={{
                        pointerEvents: 'auto',
                        backgroundColor: 'rgba(28, 28, 30, 0.95)',
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
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
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
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
                        cursor: 'crosshair',
                    }}
                />

                {/* Left Floating Collapse Toolbar */}
                <Box sx={{
                    position: 'absolute',
                    left: '16px',
                    top: '70px',
                    zIndex: 50,
                }}>
                    <Collapse in={isToolbarOpen}>
                        <Paper
                            elevation={6}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: isMobileHeight ? '10px' : '16px',
                                padding: isMobileHeight ? '16px 8px' : '24px 12px',
                                borderRadius: '24px',
                                backgroundColor: 'rgba(28, 28, 30, 0.95)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                transform: isMobileHeight ? 'scale(0.85)' : 'scale(1)',
                                transformOrigin: 'top left',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                            }}
                        >
                            {/* Color Selector */}
                            <Tooltip title="Custom Color" placement="right">
                                <Box sx={{
                                    position: 'relative',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    border: !isEraser ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                                    boxShadow: !isEraser ? '0 0 8px rgba(255,255,255,0.5)' : 'none',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => handleColorClick(e.target.value)}
                                        style={{
                                            position: 'absolute',
                                            top: '-5px',
                                            left: '-5px',
                                            width: '34px',
                                            height: '34px',
                                            border: 'none',
                                            padding: 0,
                                            cursor: 'pointer',
                                            backgroundColor: 'transparent'
                                        }}
                                    />
                                </Box>
                            </Tooltip>

                            <Divider orientation="horizontal" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                            {/* Brush Select */}
                            <Tooltip title="Brush Tool" placement="right">
                                <IconButton
                                    onClick={handleBrushClick}
                                    sx={{
                                        color: !isEraser ? '#EB5545' : 'rgba(255, 255, 255, 0.7)',
                                        backgroundColor: !isEraser ? 'rgba(235, 85, 69, 0.15)' : 'transparent',
                                        '&:hover': {
                                            backgroundColor: !isEraser ? 'rgba(235, 85, 69, 0.25)' : 'rgba(255,255,255,0.08)'
                                        },
                                        padding: '8px',
                                    }}
                                >
                                    <BrushIcon />
                                </IconButton>
                            </Tooltip>

                            {/* Eraser Select */}
                            <Tooltip title="Eraser Tool" placement="right">
                                <IconButton
                                    onClick={handleEraserClick}
                                    sx={{
                                        color: isEraser ? '#EB5545' : 'rgba(255, 255, 255, 0.7)',
                                        backgroundColor: isEraser ? 'rgba(235, 85, 69, 0.15)' : 'transparent',
                                        '&:hover': {
                                            backgroundColor: isEraser ? 'rgba(235, 85, 69, 0.25)' : 'rgba(255,255,255,0.08)'
                                        },
                                        padding: '8px',
                                    }}
                                >
                                    <EraserIcon />
                                </IconButton>
                            </Tooltip>

                            {/* Custom Brush Types (Only visible when Brush is active) */}
                            {!isEraser && (
                                <>
                                    <Divider orientation="horizontal" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <Tooltip title="Solid Brush" placement="right">
                                            <IconButton
                                                onClick={() => setBrushType('solid')}
                                                sx={{
                                                    color: brushType === 'solid' ? '#EB5545' : 'rgba(255,255,255,0.7)',
                                                    backgroundColor: brushType === 'solid' ? 'rgba(235, 85, 69, 0.15)' : 'transparent',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    width: '32px',
                                                    height: '32px'
                                                }}
                                            >
                                                S
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Highlighter" placement="right">
                                            <IconButton
                                                onClick={() => setBrushType('highlighter')}
                                                sx={{
                                                    color: brushType === 'highlighter' ? '#EB5545' : 'rgba(255,255,255,0.7)',
                                                    backgroundColor: brushType === 'highlighter' ? 'rgba(235, 85, 69, 0.15)' : 'transparent',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    width: '32px',
                                                    height: '32px'
                                                }}
                                            >
                                                H
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Dashed Brush" placement="right">
                                            <IconButton
                                                onClick={() => setBrushType('dashed')}
                                                sx={{
                                                    color: brushType === 'dashed' ? '#EB5545' : 'rgba(255,255,255,0.7)',
                                                    backgroundColor: brushType === 'dashed' ? 'rgba(235, 85, 69, 0.15)' : 'transparent',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    width: '32px',
                                                    height: '32px'
                                                }}
                                            >
                                                D
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </>
                            )}

                            <Divider orientation="horizontal" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                            {/* Brush size slider */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: isMobileHeight ? '80px' : '110px' }}>
                                <Tooltip title={`Size: ${activeSize}`} placement="right">
                                    <Box sx={{ height: isMobileHeight ? '50px' : '75px', display: 'flex', justifyContent: 'center' }}>
                                        <Slider
                                            orientation="vertical"
                                            size="small"
                                            value={activeSize}
                                            onChange={(e, val) => handleSizeChange(val)}
                                            min={1}
                                            max={isEraser ? 100 : 30}
                                            sx={{
                                                color: '#EB5545',
                                                '& .MuiSlider-thumb': {
                                                    width: 12,
                                                    height: 12,
                                                    transition: '0.3s',
                                                    '&:hover, &.Mui-focusVisible': {
                                                        boxShadow: '0px 0px 0px 8px rgba(235, 85, 69, 0.16)'
                                                    }
                                                }
                                            }}
                                        />
                                    </Box>
                                </Tooltip>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', fontSize: '0.7rem' }}>
                                    {activeSize}
                                </Typography>
                            </Box>

                            <Divider orientation="horizontal" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                            {/* Undo Button */}
                            <Tooltip title="Undo" placement="right">
                                <IconButton
                                    onClick={handleUndo}
                                    disabled={localHistory.length === 0}
                                    sx={{
                                        color: localHistory.length > 0 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255,255,255,0.2)',
                                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' }
                                    }}
                                >
                                    <UndoIcon />
                                </IconButton>
                            </Tooltip>

                            {/* Clear Board */}
                            <Tooltip title="Clear Board" placement="right">
                                <IconButton
                                    onClick={handleClear}
                                    sx={{
                                        color: '#EB5545',
                                        '&:hover': { backgroundColor: 'rgba(235, 85, 69, 0.1)' }
                                    }}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Tooltip>

                            {/* Export */}
                            <Tooltip title="Export PNG" placement="right">
                                <IconButton
                                    onClick={exportPNG}
                                    sx={{
                                        color: 'rgba(255, 255, 255, 0.8)',
                                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' }
                                    }}
                                >
                                    <DownloadIcon />
                                </IconButton>
                            </Tooltip>
                        </Paper>
                    </Collapse>
                </Box>
            </Box>
        </Box>
    );
}
