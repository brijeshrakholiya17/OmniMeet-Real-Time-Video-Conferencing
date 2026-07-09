import WebSocket from 'ws';

const activeSTTStreams = new Map();

/**
 * Process raw binary audio chunks and route them to a streaming STT provider (Deepgram).
 * 
 * @param {string} socketId - The sender's socket ID
 * @param {string} roomId - The meeting room path
 * @param {string} speakerUsername - The sender's username
 * @param {Buffer} chunk - The audio binary data
 * @param {object} io - The socket.io Server instance
 * @param {object} transcripts - The transcripts dictionary passed from socketManager.js to avoid circular imports
 */
export const processLiveAudioStream = (socketId, roomId, speakerUsername, chunk, io, transcripts) => {
    let connection = activeSTTStreams.get(socketId);

    if (!connection) {
        const apiKey = process.env.DEEPGRAM_API_KEY || "dummy_api_key";
        
        // Deepgram streaming WebSocket URL configured for low latency, high accuracy (nova-2 model) and smart formatting
        // We omit tier=enhanced to avoid API conflicts with model=nova-2 that reject the connection
        const url = 'wss://api.deepgram.com/v1/listen?interim_results=true&model=nova-2&smart_format=true';
        
        console.log(`[STT] Opening persistent cloud connection for socket: ${socketId}`);
        const ws = new WebSocket(url, {
            headers: {
                Authorization: `Token ${apiKey}`
            }
        });

        const queue = [];

        ws.on('open', () => {
            console.log(`[STT] Cloud STT stream connected for socket: ${socketId}`);
            while (queue.length > 0) {
                const queuedChunk = queue.shift();
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(queuedChunk);
                }
            }
        });

        ws.on('message', (data) => {
            try {
                const parsedData = JSON.parse(data);
                const transcriptText = parsedData.channel?.alternatives?.[0]?.transcript;

                if (transcriptText && transcriptText.trim()) {
                    // Read the username dynamically from the connection state to bypass stale closure scopes
                    const currentConn = activeSTTStreams.get(socketId);
                    const currentUsername = currentConn ? currentConn.username : speakerUsername;

                    io.to(roomId).emit("new-live-caption", {
                        username: currentUsername || "Guest",
                        text: transcriptText,
                        isFinal: parsedData.is_final
                    });

                    // Save finalized transcripts to socketManager global state for database history log
                    if (parsedData.is_final) {
                        if (transcripts[roomId] === undefined) {
                            transcripts[roomId] = [];
                        }
                        transcripts[roomId].push({
                            speaker: currentUsername || "Guest",
                            text: transcriptText,
                            timestamp: new Date()
                        });
                    }
                }
            } catch (err) {
                console.error(`[STT] Error parsing cloud message for socket ${socketId}:`, err);
            }
        });

        ws.on('error', (err) => {
            console.error(`[STT] Cloud STT WebSocket error for socket ${socketId}:`, err.message || err);
            if (err.message && err.message.includes('ETIMEDOUT') || (err.code && err.code === 'ETIMEDOUT')) {
                console.warn(`[STT] [DIAGNOSIS] Network Connection Timeout! This indicates that the server's outbound port 443 requests to 'api.deepgram.com' are blocked by your local firewall, proxy, or ISP. Please check your internet connection or use a VPN.`);
            }
        });

        ws.on('close', () => {
            console.log(`[STT] Cloud STT connection closed for socket: ${socketId}`);
            activeSTTStreams.delete(socketId);
        });

        connection = {
            ws,
            queue,
            username: speakerUsername,
            destroy: () => {
                if (ws.readyState === WebSocket.OPEN) {
                    // Send Deepgram close stream control message
                    ws.send(JSON.stringify({ type: 'CloseStream' }));
                    ws.close();
                }
                activeSTTStreams.delete(socketId);
            }
        };

        activeSTTStreams.set(socketId, connection);
    }

    // Update username dynamically on every chunk arrival to ensure it remains in sync
    connection.username = speakerUsername;

    // Forward the binary chunk directly to Deepgram WebSockets
    if (connection.ws.readyState === WebSocket.CONNECTING) {
        connection.queue.push(chunk);
    } else if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(chunk);
    }
};

/**
 * Destroy active audio streaming handle for the specified socket.id to prevent memory leaks.
 * 
 * @param {string} socketId - The socket ID to clean up
 */
export const closeSTTStream = (socketId) => {
    const connection = activeSTTStreams.get(socketId);
    if (connection) {
        console.log(`[STT] Cleaning up and destroying cloud stream for socket: ${socketId}`);
        connection.destroy();
    }
};
