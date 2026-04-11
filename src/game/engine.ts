/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GAME_CONFIG, ObstacleType, GAME_OVER_MESSAGES } from './config';
import { SoundSynth } from './audio';
import { getFromPool } from './utils';
import { PlayerEntity, createBodyBuilder } from './entities/Player';
import { Particle } from './entities/Particle';
import { GroundDetail } from './entities/Ground';
import { Obstacle } from './entities/Obstacle';
import { SceneryElement } from './entities/Scenery';

// --- ENGINE STATE ---


export interface GameEngineState {
    gameRunning: boolean;
    canRestart: boolean;
    score: number;
    gameSpeed: number;
    lastTime: number;
    // Pools
    obstaclePool: Obstacle[];
    groundPool: GroundDetail[];
    sceneryPool: SceneryElement[];
    particlePool: Particle[];
    spawnTimer: number;
    groundSpawnTimer: number;
    scenerySpawnTimer: number;
    animationId: number;
    visionAnimationId: number;
    player: PlayerEntity;
    hasStarted: boolean;
    cameraReady: boolean;
    immunityMusicPlaying: boolean;
    highScore: number;
    playerName: string;
    bgType: 'OCEAN' | 'RICE_FIELD';
    bgTimer: number;
    bgScrollX: number;
    // Juice
    shakeTimer: number;
    lastHitObstacleType: ObstacleType | null;
}

export const createGameEngine = (callbacks: {
    onScoreUpdate: (score: number) => void;
    onGameOver: () => void;
    onGameRunningChange: (isRunning: boolean) => void;
    onCanRestartChange: (canRestart: boolean) => void;
    onHasStartedChange: (hasStarted: boolean) => void;
    onCameraReadyChange: (cameraReady: boolean) => void;
    onPlayerLivesChange: (lives: number) => void;
    onPlayerPowerUpChange: (level: number, timer: number) => void;
    onPlayerHitChange: (timer: number) => void;
    onPlayerSquashStretchChange: (squash: number, stretch: number) => void;
    onShakeTimerChange: (timer: number) => void;
    onLastHitObstacleTypeChange: (type: ObstacleType | null) => void;
}) => {
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

    // --- STATE UPDATES ---
    const updateReactState = () => {
        const engine = engineRef.current;
        callbacks.onScoreUpdate(engine.score);
        callbacks.onGameRunningChange(engine.gameRunning);
        callbacks.onCanRestartChange(engine.canRestart);
        callbacks.onHasStartedChange(engine.hasStarted);
        callbacks.onCameraReadyChange(engine.cameraReady);
        callbacks.onPlayerLivesChange(engine.player.lives);
        callbacks.onPlayerPowerUpChange(engine.player.powerUpLevel, engine.player.powerUpTimer);
        callbacks.onPlayerHitChange(engine.player.hitTimer);
        callbacks.onPlayerSquashStretchChange(engine.player.squashTimer, engine.player.stretchTimer);
        callbacks.onShakeTimerChange(engine.shakeTimer);
        callbacks.onLastHitObstacleTypeChange(engine.lastHitObstacleType);
    };

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
        
        // Update React state via callbacks
        callbacks.onGameRunningChange(false);
        callbacks.onCanRestartChange(false); 
        
        if (!mutedRef.current) {
            SoundSynth.playRoar();
        }
        
        setTimeout(() => {
            engine.canRestart = true;
            callbacks.onCanRestartChange(true);
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
        const text = `I just scored ${score} points in Canggu Jump! 🌴💪

Can you beat me? #canggujump #vibejam`;
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

    // Return methods to control the engine from the React component
    return {
        engineRef,
        updateReactState,
        resetGame,
        manualStart,
        gameOver,
        handleJumpSignal,
        predictWebcam,
        enableCam,
        shareOnX,
        runGameLoop,
    };
};
