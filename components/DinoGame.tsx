/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GAME_CONFIG, ObstacleType, GAME_OVER_MESSAGES } from '../game/config';
import { SoundSynth } from '../game/audio';
import { createGameEngine, GameEngineState } from '../src/game/engine';
import { PlayerEntity } from '../game/entities/Player';
import { Particle } from '../game/entities/Particle';
import { GroundDetail } from '../game/entities/Ground';
import { Obstacle } from '../game/entities/Obstacle';
import { SceneryElement } from '../game/entities/Scenery';

// --- VISION STATE ---



    poseLandmarker: any;
    lastVideoTime: number;
    results: any;
    prevY: number;
    prevTime: number;
    smoothedVelocity: number;
    peakVelocity: number;
    JUMP_VELOCITY_THRESHOLD: number;
    lastPredictionTime: number;
}

// Entity Interfaces for Pooling
interface GameObject {
    active: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
}


// --- CONSTANTS ---


const DinoGame: React.FC = () => {
    // --- REFS ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const outputCanvasRef = useRef<HTMLCanvasElement>(null);
    const jumpSignalRef = useRef<HTMLDivElement>(null);
    
    // --- REACT STATE ---
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState("Stand back and JUMP to control!");
    const [showVision, setShowVision] = useState(false);
    const [gameRunning, setGameRunning] = useState(false);
    const [canRestart, setCanRestart] = useState(false);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const mutedRef = useRef(false);

    // --- ENGINE STATE (Mutable) ---
    const engineRef = useRef<GameEngineState>({
        gameRunning: false,
        canRestart: false,
        score: 0,
        gameSpeed: GAME_CONFIG.INITIAL_SPEED,
        lastTime: 0,
        // Pre-allocate pools
        obstaclePool: Array.from({ length: 10 }, () => new Obstacle()),
        groundPool: Array.from({ length: 50 }, () => new GroundDetail()),
        sceneryPool: Array.from({ length: 15 }, () => new SceneryElement()),
        particlePool: Array.from({ length: 30 }, () => new Particle()),
        spawnTimer: 0,
        groundSpawnTimer: 0,
        scenerySpawnTimer: 0,
        animationId: 0,
        visionAnimationId: 0,
        player: createBodyBuilder(),
        hasStarted: false,
        cameraReady: false,
        immunityMusicPlaying: false,
        highScore: 0,
        playerName: 'LEGEND',
        bgType: 'OCEAN',
        bgTimer: 0,
        bgScrollX: 0,
        // Juice
        shakeTimer: 0,
        lastHitObstacleType: null
    });

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
        lastPredictionTime: 0
    });

    useEffect(() => {
        mutedRef.current = isMuted;
    }, [isMuted]);

    // --- MODULE 0: FOUNDATIONAL QUICK WINS ---

    // Task 0.1: Keyboard Fallback
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input field
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                handleJumpSignal();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Task 0.2: Load High Score
    useEffect(() => {
        const savedHighScore = localStorage.getItem('cangguJumpHighScore');
        if (savedHighScore) {
            engineRef.current.highScore = parseInt(savedHighScore, 10);
        }
    }, []);

    // --- GAME LOGIC ---

    const spawnObstacle = (dt: number) => {
        const engine = engineRef.current;
        engine.spawnTimer -= dt;
        
        if (engine.spawnTimer <= 0) {
            const r = Math.random();
            // Easier: fewer obstacles at once
            let count = r > 0.9 ? 2 : 1;

            let nextX = GAME_CONFIG.CANVAS_WIDTH; 

            for (let i = 0; i < count; i++) {
                const obstacle = getFromPool(engine.obstaclePool, () => new Obstacle());
                obstacle.spawn(nextX);
                nextX += obstacle.width + (10 + Math.random() * 30); 
            }
            
            // Easier: more space between spawns
            engine.spawnTimer = 1.5 + (count * 0.5) + Math.random() * 1.5; 
            
            if(engine.gameSpeed < GAME_CONFIG.MAX_SPEED) {
                engine.gameSpeed += engine.gameSpeed < 600 ? GAME_CONFIG.SPEED_INCREMENT : GAME_CONFIG.SPEED_INCREMENT / 2; 
            }
        }
    };

    const spawnGroundDetails = (dt: number) => {
        const engine = engineRef.current;
        engine.groundSpawnTimer -= dt;
        if (engine.groundSpawnTimer <= 0) {
            const detail = getFromPool(engine.groundPool, () => new GroundDetail());
            detail.spawn(GAME_CONFIG.CANVAS_WIDTH);
            engine.groundSpawnTimer = 0.05 + Math.random() * 0.2; 
        }
    };

    const spawnScenery = (dt: number) => {
        const engine = engineRef.current;
        engine.scenerySpawnTimer -= dt;
        if (engine.scenerySpawnTimer <= 0) {
            const scenery = getFromPool(engine.sceneryPool, () => new SceneryElement());
            
            let type: 'PALM' | 'COCONUT' | 'BANANA' | 'SURFER' | 'BIG_VILLA' | 'FARMER';
            const r = Math.random();
            
            if (r > 0.6) {
                // Trees are always possible
                const trees: ('PALM' | 'COCONUT' | 'BANANA')[] = ['PALM', 'COCONUT', 'BANANA'];
                type = trees[Math.floor(Math.random() * trees.length)];
            } else {
                // Biome specific spawning
                type = engine.bgType === 'OCEAN' ? 'SURFER' : 'FARMER';
            }
            
            scenery.spawn(GAME_CONFIG.CANVAS_WIDTH + 200, type);
            engine.scenerySpawnTimer = 0.6 + Math.random() * 1.5;
        }
    };

    const gameOver = () => {
        const engine = engineRef.current;
        engine.gameRunning = false;
        engine.canRestart = false;
        
        if (engine.score / 10 > engine.highScore) {
            engine.highScore = Math.floor(engine.score / 10);
            localStorage.setItem('cangguJumpHighScore', engine.highScore.toString());
        }

        SoundSynth.stopImmunityMusic();
        
        setGameRunning(false);
        setCanRestart(false); 
        
        if (!mutedRef.current) {
            SoundSynth.playRoar();
        }
        
        setTimeout(() => {
            engine.canRestart = true;
            setCanRestart(true);
        }, 1000);
    };

    const runGameLoop = (timestamp: number) => {
        const engine = engineRef.current;
        if (!engine.gameRunning) return;

        if (!engine.lastTime) engine.lastTime = timestamp;
        // Cap Delta Time to prevent huge jumps on frame drops (0.1s max)
        const dt = Math.min((timestamp - engine.lastTime) / 1000, 0.1); 
        engine.lastTime = timestamp;

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d', { alpha: false })!; // Optimize for no transparency

        // Update Juice
        if (engine.shakeTimer > 0) engine.shakeTimer -= dt;

        ctx.save();
        if (engine.shakeTimer > 0) {
            const shakeAmount = 5;
            ctx.translate((Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount);
        }

        // 1. Draw Background (Parallax Layers)
        // Sky
        ctx.fillStyle = GAME_CONFIG.COLORS.SKY;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Realistic Sun
        const sunX = canvas.width - 120;
        const sunY = 70;
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 50);
        sunGrad.addColorStop(0, '#fff9c4');
        sunGrad.addColorStop(0.4, '#fde68a');
        sunGrad.addColorStop(1, 'rgba(253, 230, 138, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
        ctx.fill();

        // Background Logic (Ocean / Rice Fields)
        engine.bgTimer += dt;
        engine.bgScrollX = (engine.bgScrollX + engine.gameSpeed * 0.2 * dt) % 1000;

        if (engine.bgTimer > 15) {
            // Trigger transition with a Big Villa
            const scenery = getFromPool(engine.sceneryPool, () => new SceneryElement());
            scenery.spawn(GAME_CONFIG.CANVAS_WIDTH + 300, 'BIG_VILLA');
            
            // Switch biome
            engine.bgType = engine.bgType === 'OCEAN' ? 'RICE_FIELD' : 'OCEAN';
            engine.bgTimer = 0;
            
            // Pause scenery spawning briefly to let the transition feel clean
            engine.scenerySpawnTimer = 2.5;
        }

        if (engine.bgType === 'OCEAN') {
            // Ocean
            ctx.fillStyle = GAME_CONFIG.COLORS.OCEAN;
            ctx.fillRect(0, 160, canvas.width, 40);
            
            // Background Waves (Smaller, distant)
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            const bgWaveTime = Date.now() / 2000;
            for(let i=0; i<8; i++) {
                const wx = (bgWaveTime * 40 + i * 150) % (canvas.width + 200) - 100;
                const wy = 162;
                ctx.beginPath();
                ctx.moveTo(wx, wy + 5);
                ctx.lineTo(wx + 10, wy - 2);
                ctx.quadraticCurveTo(wx + 20, wy - 5, wx + 30, wy - 2);
                ctx.lineTo(wx + 40, wy + 5);
                ctx.fill();
            }

            // Realistic Waves (Sharp angles + Rounded crests)
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            const waveTime = Date.now() / 1200;
            for(let i=0; i<5; i++) {
                const wx = (waveTime * 80 + i * 220) % (canvas.width + 300) - 150;
                const wy = 165;
                
                ctx.beginPath();
                // Sharp geometric start (The face)
                ctx.moveTo(wx, wy + 15);
                ctx.lineTo(wx + 20, wy - 5);
                // Rounded crest (The foam)
                ctx.quadraticCurveTo(wx + 35, wy - 15, wx + 50, wy - 5);
                ctx.quadraticCurveTo(wx + 65, wy + 5, wx + 80, wy + 15);
                ctx.fill();
            }
        } else {
            // Rice Fields (Multiple levels with smooth lines)
            const levels = [
                { y: 160, color: '#166534' },
                { y: 175, color: '#15803d' },
                { y: 190, color: '#16a34a' }
            ];
            
            levels.forEach((level, idx) => {
                ctx.fillStyle = level.color;
                ctx.beginPath();
                ctx.moveTo(0, level.y);
                
                const scrollOffset = (engine.bgScrollX * (1 + idx * 0.2)) % 100;
                ctx.save();
                ctx.translate(-scrollOffset, 0);
                
                for(let x=-100; x<=canvas.width + 200; x+=50) {
                    const cp1x = x + 25;
                    const cp1y = level.y - 10;
                    ctx.quadraticCurveTo(cp1x, cp1y, x + 50, level.y);
                }
                ctx.lineTo(canvas.width + 200, 200);
                ctx.lineTo(-100, 200);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });
        }
        
        // Volcanic Sand
        ctx.fillStyle = GAME_CONFIG.COLORS.SAND;
        ctx.fillRect(0, 200, canvas.width, 42);

        // Scenery Logic & Draw (Layer 2 - Mid)
        spawnScenery(dt);
        for(let i = 0; i < engine.sceneryPool.length; i++) {
            const scenery = engine.sceneryPool[i];
            if (scenery.active) {
                scenery.update(dt, engine.gameSpeed);
                scenery.draw(ctx);
            }
        }

        // Set global styles for the frame
        ctx.strokeStyle = GAME_CONFIG.COLORS.PRIMARY;
        ctx.fillStyle = GAME_CONFIG.COLORS.PRIMARY;
        ctx.lineWidth = 2;

        // 2. Draw Ground Line
        ctx.beginPath();
        ctx.moveTo(0, GAME_CONFIG.GROUND_Y);
        ctx.lineTo(canvas.width, GAME_CONFIG.GROUND_Y);
        ctx.stroke();

        // 3. Logic & Draw Ground Details
        spawnGroundDetails(dt);
        // Using For loop instead of forEach for perf
        for(let i = 0; i < engine.groundPool.length; i++) {
            const detail = engine.groundPool[i];
            if (detail.active) {
                detail.update(dt, engine.gameSpeed);
                detail.draw(ctx);
            }
        }

        // 4. Logic & Draw Player
        engine.player.update(dt, () => {
            if (!mutedRef.current) SoundSynth.playStep();
        }, () => {
            // onLand
            for (let i = 0; i < 8; i++) {
                const p = getFromPool(engine.particlePool, () => new Particle());
                p.spawn(engine.player.x + engine.player.width / 2, GAME_CONFIG.GROUND_Y, '#ddd', 'DUST');
            }
        });
        engine.player.draw(ctx);

        // Update and Draw Particles
        for (let i = 0; i < engine.particlePool.length; i++) {
            const p = engine.particlePool[i];
            if (p.active) {
                p.update(dt);
                p.draw(ctx);
            }
        }

        // Draw Hearts (Lives)
        for (let i = 0; i < 3; i++) {
            const hx = 25 + i * 35;
            const hy = 25;
            ctx.fillStyle = i < engine.player.lives ? '#ff5252' : '#444';
            
            // Draw a simple heart shape
            ctx.beginPath();
            ctx.moveTo(hx, hy + 5);
            ctx.bezierCurveTo(hx, hy, hx - 10, hy, hx - 10, hy + 5);
            ctx.bezierCurveTo(hx - 10, hy + 12, hx, hy + 18, hx, hy + 22);
            ctx.bezierCurveTo(hx, hy + 18, hx + 10, hy + 12, hx + 10, hy + 5);
            ctx.bezierCurveTo(hx + 10, hy, hx, hy, hx, hy + 5);
            ctx.fill();
        }

        // Draw Immunity Timer
        if (engine.player.powerUpTimer > 0) {
            ctx.fillStyle = 'cyan';
            ctx.font = "10px 'Press Start 2P'";
            ctx.textAlign = "left";
            ctx.fillText(`IMMUNITY: ${engine.player.powerUpTimer.toFixed(1)}s`, 20, 55);
            
            if (engine.player.powerUpTimer > 2) {
                ctx.fillStyle = GAME_CONFIG.COLORS.PINK_FLUO;
                ctx.font = "14px 'Press Start 2P'";
                ctx.textAlign = "center";
                ctx.fillText("Protein-infused mode", canvas.width / 2, 80);
            }
        }

        // 5. Logic & Draw Obstacles
        spawnObstacle(dt);
        const player = engine.player;
        // Easier: smaller collision padding
        const padding = 15;
        
        for(let i = 0; i < engine.obstaclePool.length; i++) {
            const obs = engine.obstaclePool[i];
            if (obs.active) {
                obs.update(dt, engine.gameSpeed);
                obs.draw(ctx);
                
                // Collision Detection (Active obstacles only)
                const isPowerUp = obs.type === ObstacleType.PROTEIN_SHAKE;
                const isPadel = obs.type === ObstacleType.PADEL_BALL;
                const isScooter = obs.type === ObstacleType.SCOOTER || obs.type === ObstacleType.TRIPLE_SCOOTER;
                const isPothole = obs.type === ObstacleType.POTHOLE;
                const isBird = obs.type === ObstacleType.BIRD;
                const isDog = obs.type === ObstacleType.DOG;
                const isPoo = obs.type === ObstacleType.DOG_POO;

                // Simplified collision for ground
                const playerBottom = player.y + player.height;
                const obsBottom = obs.y + obs.height;
                
                if (
                    player.x < obs.x + obs.width - padding &&
                    player.x + player.width > obs.x + padding &&
                    player.y < obsBottom &&
                    playerBottom >= obs.y &&
                    !obs.isCrashed
                ) {
                    if (isPowerUp) {
                        obs.active = false;
                        player.powerUpTimer = 7; // 7 seconds
                        player.powerUpLevel = Math.min(player.powerUpLevel + 1, 2);
                        if (!mutedRef.current) SoundSynth.startImmunityMusic();
                        // Particle effect for powerup
                        for (let j = 0; j < 15; j++) {
                            const p = getFromPool(engine.particlePool, () => new Particle());
                            p.spawn(obs.x + obs.width / 2, obs.y + obs.height / 2, 'cyan', 'SPARKLE');
                        }
                    } else if (player.powerUpTimer > 0) {
                        // Immunity knock-off
                        obs.isCrashed = true;
                        obs.crashVX = 500 + Math.random() * 300;
                        obs.crashVY = -500 - Math.random() * 300;
                        engine.shakeTimer = 0.1; // Light shake when immune
                    } else if (player.hitTimer <= 0) {
                        // Human collision logic: All take 1 life
                        obs.active = false;
                        player.lives -= 1;
                        player.hitTimer = 1.0; // 1 second flash
                        engine.shakeTimer = 0.3; // Intense shake
                        if (player.lives <= 0) {
                            engine.lastHitObstacleType = obs.type;
                            gameOver();
                        }
                    }
                }
            }
        }

        // 6. Draw Score
        if (engine.gameRunning) { // Double check in case of game over mid-loop
            engine.score += 60 * dt;
            const scoreStr = `HI ${Math.floor(engine.score/10)}`;
            // Font is set once ideally, but to be safe:
            ctx.font = "16px 'Press Start 2P'";
            ctx.textAlign = "right";
            ctx.fillText(scoreStr, canvas.width - 20, 30);
            
            ctx.restore(); // Restore shake translation
            engine.animationId = requestAnimationFrame(runGameLoop);
        } else {
            ctx.restore();
        }
    };

    const resetGame = () => {
        const engine = engineRef.current;
        
        // Deactivate all pool items
        engine.obstaclePool.forEach(p => p.active = false);
        engine.groundPool.forEach(p => p.active = false);
        engine.sceneryPool.forEach(p => p.active = false);
        
        // Populate initial ground
        for (let x = 0; x < GAME_CONFIG.CANVAS_WIDTH; x += 30 + Math.random() * 60) {
            const detail = getFromPool(engine.groundPool, () => new GroundDetail());
            detail.spawn(x);
        }

        // Populate initial scenery
        for (let x = 0; x < GAME_CONFIG.CANVAS_WIDTH; x += 150 + Math.random() * 200) {
            const scenery = getFromPool(engine.sceneryPool, () => new SceneryElement());
            scenery.spawn(x, 'PALM');
        }

        engine.score = 0;
        engine.canRestart = false;
        engine.gameSpeed = GAME_CONFIG.INITIAL_SPEED;
        engine.spawnTimer = 0;
        engine.groundSpawnTimer = 0;
        engine.scenerySpawnTimer = 0;
        engine.bgTimer = 0;
        engine.bgScrollX = 0;
        engine.bgType = 'OCEAN';
        engine.lastHitObstacleType = null;
        engine.player.reset();
        engine.lastTime = 0;
        engine.gameRunning = true;
        
        setGameRunning(true);
        setCanRestart(false);
        
        runGameLoop(0);
    };

    const manualStart = () => {
        if (playerNameInput.trim()) {
            engineRef.current.playerName = playerNameInput.trim().toUpperCase();
        }
        SoundSynth.init();
        if (!mutedRef.current) SoundSynth.playClick();
        setHasStarted(true);
        engineRef.current.hasStarted = true;
        resetGame();
    };

    const shareOnX = () => {
        if (!mutedRef.current) SoundSynth.playClick();
        const score = Math.floor(engineRef.current.score / 10);
        const text = `I just scored ${score} points in Canggu Jump! 🌴💪\n\nCan you beat me? #canggujump #vibejam`;
        const url = window.location.href;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    };

    const handleJumpSignal = () => {
        if (jumpSignalRef.current) {
            jumpSignalRef.current.classList.add('active');
            setTimeout(() => jumpSignalRef.current?.classList.remove('active'), 200);
        }

        const engine = engineRef.current;
        if (engine.gameRunning) {
            const jumped = engine.player.jump();
            if (jumped && !mutedRef.current) {
                SoundSynth.playJump();
            }
        } else if (!engine.gameRunning && engine.canRestart) {
            resetGame();
        } else if (!engine.hasStarted && engine.cameraReady) {
            manualStart();
        }
    };

    // --- VISION LOGIC ---

    const predictWebcam = () => {
        const video = videoRef.current;
        const outCanvas = outputCanvasRef.current;
        const engine = engineRef.current;
        
        if (!video || !outCanvas || !visionRef.current.poseLandmarker) {
            engine.visionAnimationId = requestAnimationFrame(predictWebcam);
            return;
        }

        const now = performance.now();
        const timeSinceLast = now - visionRef.current.lastPredictionTime;
        const frameInterval = 1000 / GAME_CONFIG.VISION_FPS;

        if (timeSinceLast < frameInterval) {
            engine.visionAnimationId = requestAnimationFrame(predictWebcam);
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
            // Simple loop
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

        engine.visionAnimationId = requestAnimationFrame(predictWebcam);
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
                    engineRef.current.cameraReady = true;
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
            cancelAnimationFrame(engineRef.current.animationId);
            cancelAnimationFrame(engineRef.current.visionAnimationId);
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
                        if (!mutedRef.current) SoundSynth.playClick();
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
                {(!gameRunning && !canRestart && !hasStarted) && (
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
                                            if (!mutedRef.current) SoundSynth.playClick();
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
                {(hasStarted && !gameRunning) && (
                    <div className="absolute top-0 left-0 w-full h-full bg-black/80 flex flex-col items-center justify-center z-10 rounded-lg text-center p-2 md:p-4">
                        <div className="text-red-500 text-2xl md:text-4xl font-press-start mb-6 drop-shadow-md uppercase">GAME OVER</div>
                        
                        <div className="bg-white/10 backdrop-blur-sm p-4 md:p-6 rounded-2xl mb-6 border border-white/20 w-full max-w-[80%]">
                            <div className="text-white text-[10px] md:text-xs font-press-start mb-2 opacity-80 uppercase">
                                {engineRef.current.playerName}
                            </div>
                            <div className="text-white text-xl md:text-2xl font-press-start mb-2">
                                SCORE: {Math.floor(engineRef.current.score / 10)}
                            </div>
                            <div className="text-orange-400 text-sm md:text-lg font-press-start mb-4">
                                HIGH SCORE: {engineRef.current.highScore}
                            </div>
                            {engineRef.current.lastHitObstacleType && (
                                <div className="text-yellow-200 text-[10px] md:text-xs font-press-start leading-relaxed italic border-t border-white/10 pt-4">
                                    "{GAME_OVER_MESSAGES[engineRef.current.lastHitObstacleType]}"
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
                                {canRestart ? "JUMP TO RESTART" : "GET READY..."}
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
