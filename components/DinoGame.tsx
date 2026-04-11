/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import { GAME_CONFIG, GAME_OVER_MESSAGES } from '../game/config';
import { SoundSynth } from '../game/audio';
import { createGameEngine, GameEngine, GameEngineState } from '../game/engine';

interface VisionState {
    poseLandmarker: any;
    lastVideoTime: number;
    results: any;
    prevY: number;
    prevTime: number;
    smoothedVelocity: number;
    peakVelocity: number;
    JUMP_VELOCITY_THRESHOLD: number;
    lastPredictionTime: number;
    visionAnimationId: number;
}

const DinoGame: React.FC = () => {
    // --- REFS ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const outputCanvasRef = useRef<HTMLCanvasElement>(null);
    const jumpSignalRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    
    // --- REACT STATE ---
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState("Stand back and JUMP to control!");
    const [showVision, setShowVision] = useState(false);
    const [gameState, setGameState] = useState<GameEngineState | null>(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [playerNameInput, setPlayerNameInput] = useState("");

    // --- VISION STATE (Mutable) ---
    const visionRef = useRef<VisionState>({
        poseLandmarker: null,
        lastVideoTime: -1,
        results: undefined,
        prevY: 0,
        prevTime: 0,
        smoothedVelocity: 0,
        peakVelocity: 0,
        JUMP_VELOCITY_THRESHOLD: 1.5,
        lastPredictionTime: 0,
        visionAnimationId: 0,
    });

    useEffect(() => {
        SoundSynth.setMuted(isMuted);
    }, [isMuted]);

    // Initialize game engine
    useEffect(() => {
        if (!engineRef.current) {
            engineRef.current = createGameEngine({
                onStateChange: (newState) => {
                    setGameState(newState);
                }
            });
            setGameState(engineRef.current.getMutableState());
        }

        if (canvasRef.current) {
            engineRef.current.setCanvas(canvasRef.current);
        }

        return () => {
            engineRef.current?.stop();
        }
    }, []);


    // Keyboard Fallback
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                handleJumpSignal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cameraReady, gameState?.hasStarted, gameState?.canRestart]); // Re-bind when state influencing jump changes

    const manualStart = () => {
        if (playerNameInput.trim()) {
            engineRef.current?.setPlayerName(playerNameInput.trim().toUpperCase());
        }
        SoundSynth.init();
        SoundSynth.playClick();
        engineRef.current?.start();
    };

    const shareOnX = () => {
        SoundSynth.playClick();
        if (!gameState) return;
        const score = Math.floor(gameState.score / 10);
        const text = `I just scored ${score} points in Canggu Jump! 🌴💪\n\nCan you beat me? #canggujump #vibejam`;
        const url = window.location.href;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    };

    const handleJumpSignal = () => {
        if (jumpSignalRef.current) {
            jumpSignalRef.current.classList.add('active');
            setTimeout(() => jumpSignalRef.current?.classList.remove('active'), 200);
        }

        if (!gameState) return;

        if (gameState.gameRunning || gameState.canRestart) {
            engineRef.current?.handleJump();
        } else if (!gameState.hasStarted && cameraReady) {
            manualStart();
        }
    };

    // --- VISION LOGIC ---

    const predictWebcam = () => {
        const video = videoRef.current;
        const outCanvas = outputCanvasRef.current;
        
        if (!video || !outCanvas || !visionRef.current.poseLandmarker) {
            visionRef.current.visionAnimationId = requestAnimationFrame(predictWebcam);
            return;
        }

        const now = performance.now();
        const timeSinceLast = now - visionRef.current.lastPredictionTime;
        const frameInterval = 1000 / GAME_CONFIG.VISION_FPS;

        if (timeSinceLast < frameInterval) {
            visionRef.current.visionAnimationId = requestAnimationFrame(predictWebcam);
            return;
        }
        visionRef.current.lastPredictionTime = now;

        const state = visionRef.current;
        const { poseLandmarker } = state;

        if (video.videoWidth > 0 && video.videoHeight > 0) {
             if (outCanvas.width !== video.videoWidth || outCanvas.height !== video.videoHeight) {
                outCanvas.width = video.videoWidth;
                outCanvas.height = video.videoHeight;
             }
        }

        const outCtx = outCanvas.getContext('2d', { alpha: true })!;
        
        let didUpdate = false;
        if (state.lastVideoTime !== video.currentTime) {
            state.lastVideoTime = video.currentTime;
            state.results = poseLandmarker.detectForVideo(video, now);
            didUpdate = true;
        }
        
        outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
        
        if (state.results && state.results.landmarks && state.results.landmarks.length > 0) {
            const landmarks = state.results.landmarks[0];
            const leftShoulder = landmarks[11];
            const rightShoulder = landmarks[12];

            outCtx.beginPath();
            outCtx.moveTo(leftShoulder.x * outCanvas.width, leftShoulder.y * outCanvas.height);
            outCtx.lineTo(rightShoulder.x * outCanvas.width, rightShoulder.y * outCanvas.height);
            outCtx.strokeStyle = GAME_CONFIG.COLORS.ACCENT;
            outCtx.lineWidth = 3;
            outCtx.stroke();

            outCtx.fillStyle = '#00FF00';
            const shoulders = [leftShoulder, rightShoulder];
            for (let i = 0; i < shoulders.length; i++) {
                outCtx.beginPath();
                outCtx.arc(shoulders[i].x * outCanvas.width, shoulders[i].y * outCanvas.height, 5, 0, 2 * Math.PI);
                outCtx.fill();
            }

            if (didUpdate) {
                const currentY = (leftShoulder.y + rightShoulder.y) / 2;
                const shoulderDist = Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y);
                
                const currentTime = video.currentTime;
                let currentVelocity = 0;

                if (state.prevTime > 0 && currentTime > state.prevTime) {
                    const dt = currentTime - state.prevTime; 
                    const dy = state.prevY - currentY; 
                    const normalizedDy = dy / shoulderDist;
                    currentVelocity = normalizedDy / dt;
                }
                
                state.smoothedVelocity = state.smoothedVelocity * 0.3 + currentVelocity * 0.7;
                
                if (state.smoothedVelocity > state.peakVelocity) {
                    state.peakVelocity = state.smoothedVelocity;
                } else {
                    state.peakVelocity *= 0.95;
                }

                state.prevY = currentY;
                state.prevTime = currentTime;
                
                if (state.smoothedVelocity > state.JUMP_VELOCITY_THRESHOLD) {
                    handleJumpSignal();
                }
            }

            drawDebugOverlay(outCtx, state);
        }

        visionRef.current.visionAnimationId = requestAnimationFrame(predictWebcam);
    };

    const drawDebugOverlay = (ctx: CanvasRenderingContext2D, state: VisionState) => {
        const barH = 100;
        const barW = 15;
        const barX = 20; 
        const barY = 50;
        const maxVal = state.JUMP_VELOCITY_THRESHOLD * 1.5;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barY, barW, barH);

        const threshPixel = (state.JUMP_VELOCITY_THRESHOLD / maxVal) * barH;
        const threshY = barY + barH - threshPixel;
        ctx.fillStyle = 'red';
        ctx.fillRect(barX - 5, threshY, barW + 10, 2);

        const fillRatio = Math.min(Math.max(state.smoothedVelocity / maxVal, 0), 1);
        const currentH = fillRatio * barH;
        
        const isCrossing = state.smoothedVelocity > state.JUMP_VELOCITY_THRESHOLD;
        ctx.fillStyle = isCrossing ? '#00FF00' : '#FFFF00';
        ctx.fillRect(barX, barY + barH - currentH, barW, currentH);

        const peakRatio = Math.min(Math.max(state.peakVelocity / maxVal, 0), 1);
        const peakH = peakRatio * barH;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)'; 
        ctx.fillRect(barX, barY + barH - peakH, barW, 2);

        ctx.save();
        ctx.scale(-1, 1); 
        ctx.fillStyle = '#00FF00';
        ctx.font = '12px monospace';
        ctx.fillText(`VEL : ${state.smoothedVelocity.toFixed(2)}`, -(barX + 70), barY + barH + 20);
        ctx.fillStyle = 'red';
        ctx.fillText(`THR : ${state.JUMP_VELOCITY_THRESHOLD.toFixed(2)}`, -(barX + 70), barY + barH + 35);
        ctx.restore();
    };

    const enableCam = async () => {
        SoundSynth.init();
        if (!visionRef.current.poseLandmarker) {
            setStatus("AI model not ready yet...");
            return;
        }

        try {
            setStatus("Requesting camera access...");
            
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Camera API not supported in this browser.");
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 320 }, 
                    height: { ideal: 240 },
                    facingMode: "user"
                }
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch(e => console.error("Video play failed", e));
                    predictWebcam();
                    setCameraReady(true);
                    setStatus("Camera ready! Stand back and jump.");
                };
            }
        } catch(err) {
            console.error("Camera Error:", err);
            let msg = "Camera error: ";
            if (err instanceof Error) {
                if (err.name === 'NotAllowedError' || err.message.includes('not allowed')) {
                    msg += "Permission denied. Please check site settings.";
                } else if (err.name === 'NotFoundError') {
                    msg += "No camera found.";
                } else {
                    msg += err.message;
                }
            } else {
                msg += "Unknown error.";
            }
            setStatus(msg);
            alert(msg + "\n\nTry opening the app in a new tab if you're in a restricted environment.");
        }
    };

    useEffect(() => {
        const initMediaPipe = async () => {
            try {
                // @ts-ignore
                const { PoseLandmarker, FilesetResolver } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/+esm");
                
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
                );
                
                visionRef.current.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numPoses: 1
                });

                setIsLoading(false);
                setModelLoaded(true);
            } catch (err) {
                console.error(err);
                setStatus("Failed to load AI.");
            }
        };

        initMediaPipe();

        return () => {
            cancelAnimationFrame(visionRef.current.visionAnimationId);
        };
    }, []);

    return (
        <div className="flex flex-col items-center gap-5 w-full max-w-4xl relative">
            
            {/* GAME CANVAS */}
            <div className="relative">
                <canvas 
                    ref={canvasRef} 
                    width={GAME_CONFIG.CANVAS_WIDTH} 
                    height={GAME_CONFIG.CANVAS_HEIGHT}
                    className="bg-white border-2 border-[#333] rounded-lg shadow-md max-w-full"
                />

                {/* MUTE BUTTON */}
                <button
                    onClick={() => {
                        SoundSynth.playClick();
                        setIsMuted(!isMuted);
                    }}
                    className={`group absolute top-[4%] left-[2.5%] z-20 w-[3%] h-auto text-[#535353] hover:text-[#333] transition-colors focus:outline-none focus:ring-2 focus:ring-[${GAME_CONFIG.COLORS.FOCUS}] rounded-sm aspect-square`}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                    style={{ minWidth: '1px' }}
                >
                    {isMuted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                            <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                            <line x1="23" y1="9" x2="17" y2="15"></line>
                            <line x1="17" y1="9" x2="23" y2="15"></line>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                    )}
                    <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-[#333] text-white text-[0.65rem] font-press-start rounded opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-sm z-30">
                        {isMuted ? "Unmute" : "Mute"}
                    </span>
                </button>
                
                {/* START SCREEN */}
                {gameState && (!gameState.gameRunning && !gameState.canRestart && !gameState.hasStarted) && (
                    <div className="absolute top-0 left-0 w-full h-full bg-black/70 flex flex-col items-center justify-center z-10 rounded-lg">
                        <h1 className="text-white text-3xl md:text-5xl font-press-start mb-6 tracking-widest drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]">
                            CANGGU JUMP
                        </h1>
                        
                        <div className="mb-8 flex flex-col items-center">
                            <label className="text-white font-press-start text-[10px] mb-2">ENTER YOUR NAME:</label>
                            <input 
                                type="text" 
                                value={playerNameInput}
                                onChange={(e) => setPlayerNameInput(e.target.value.slice(0, 10))}
                                placeholder="PLAYER 1"
                                className="bg-white/20 border-2 border-white text-white px-4 py-2 font-press-start text-sm focus:outline-none focus:bg-white/40 rounded"
                            />
                        </div>

                        {isLoading ? (
                            <>
                                <div className="w-8 h-8 border-4 border-[#f3f3f3] border-t-[#535353] rounded-full animate-spin mb-5"></div>
                                <p className="font-press-start text-xs text-white">Loading AI Model...</p>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-6">
                                {!cameraReady ? (
                                    <button 
                                        onClick={() => {
                                            SoundSynth.init();
                                            SoundSynth.playClick();
                                            enableCam();
                                        }} 
                                        className={`px-8 py-4 bg-white text-black font-press-start text-base cursor-pointer hover:bg-orange-500 hover:text-white transition-all rounded-lg shadow-xl transform hover:scale-105`}
                                    >
                                        ENABLE CAMERA
                                    </button>
                                ) : (
                                    <>
                                        <button 
                                            onClick={manualStart} 
                                            className={`px-8 py-4 bg-orange-500 text-white font-press-start text-base cursor-pointer hover:bg-orange-600 transition-all rounded-lg shadow-xl transform hover:scale-105`}
                                        >
                                            START GAME
                                        </button>
                                        <p className="font-press-start text-xs text-white animate-pulse">
                                            OR JUMP TO START
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* GAME OVER SCREEN */}
                {gameState && (gameState.hasStarted && !gameState.gameRunning) && (
                    <div className="absolute top-0 left-0 w-full h-full bg-black/80 flex flex-col items-center justify-center z-10 rounded-lg text-center p-2 md:p-4">
                        <div className="text-red-500 text-2xl md:text-4xl font-press-start mb-6 drop-shadow-md uppercase">GAME OVER</div>
                        
                        <div className="bg-white/10 backdrop-blur-sm p-4 md:p-6 rounded-2xl mb-6 border border-white/20 w-full max-w-[80%]">
                            <div className="text-white text-[10px] md:text-xs font-press-start mb-2 opacity-80 uppercase">
                                {gameState.playerName}
                            </div>
                            <div className="text-white text-xl md:text-2xl font-press-start mb-2">
                                SCORE: {Math.floor(gameState.score / 10)}
                            </div>
                            <div className="text-orange-400 text-sm md:text-lg font-press-start mb-4">
                                HIGH SCORE: {gameState.highScore}
                            </div>
                            {gameState.lastHitObstacleType && (
                                <div className="text-yellow-200 text-[10px] md:text-xs font-press-start leading-relaxed italic border-t border-white/10 pt-4">
                                    "{GAME_OVER_MESSAGES[gameState.lastHitObstacleType]}"
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-4 items-center">
                            <button 
                                onClick={(e) => { e.stopPropagation(); shareOnX(); }}
                                className="bg-[#1DA1F2] hover:bg-[#1A91DA] text-white px-6 py-3 rounded-lg font-press-start text-[10px] md:text-xs flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                            >
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                SHARE ON X
                            </button>

                            <div className="text-white text-[10px] md:text-sm font-press-start animate-pulse mt-2">
                                {gameState.canRestart ? "JUMP TO RESTART" : "GET READY..."}
                            </div>
                        </div>
                        
                        <p className="text-white/30 text-[8px] md:text-[10px] font-press-start italic mt-6">
                            Never skip leg days. Keep jumping.
                        </p>
                    </div>
                )}
            </div>

            {/* STATUS */}
            <div className="mt-2 text-sm text-[#666] min-h-[1.25rem] font-press-start text-center w-full px-2">
                {status}
            </div>

            {/* CONTROLS */}
            <div className="mt-2 text-xs text-[#888] text-center font-press-start flex gap-4">
                <label className="cursor-pointer flex items-center justify-center hover:text-[#535353] transition-colors">
                    <input 
                        type="checkbox" 
                        checked={showVision} 
                        onChange={(e) => setShowVision(e.target.checked)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                setShowVision(!showVision);
                            }
                        }}
                        className={`mr-2 w-4 h-4 accent-[${GAME_CONFIG.COLORS.FOCUS}] focus:outline-none focus:ring-2 focus:ring-[${GAME_CONFIG.COLORS.FOCUS}] focus:ring-offset-2 focus:ring-offset-[#f7f7f7] rounded cursor-pointer`}
                    />
                    Show Camera Feed (Debug)
                </label>
            </div>

            {/* VISION CONTAINER */}
            <div 
                className={`relative w-[320px] h-[240px] border-2 border-[#ccc] rounded-lg overflow-hidden bg-black ${showVision ? 'block' : 'hidden'}`}
            >
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                ></video>
                <canvas 
                    ref={outputCanvasRef} 
                    className="absolute top-0 left-0 w-full h-full scale-x-[-1]"
                ></canvas>
                <div 
                    ref={jumpSignalRef}
                    className="absolute top-[10px] right-[10px] w-5 h-5 bg-[#ccc] rounded-full transition-all duration-100 [&.active]:bg-[#ff5252] [&.active]:shadow-[0_0_10px_#ff5252]"
                ></div>
            </div>
        </div>
    );
};

export default DinoGame;
