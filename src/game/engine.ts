/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GAME_CONFIG, ObstacleType } from './config';
import { OBSTACLE_DEFINITIONS } from './obstacles.config';
import { SoundSynth } from './audio';
import { getFromPool, loadImages } from './utils';
import { PlayerEntity, createBodyBuilder } from './entities/Player';
import { Particle } from './entities/Particle';
import { GroundDetail } from './entities/Ground';
import { Obstacle } from './entities/Obstacle';
import { SceneryElement } from './entities/Scenery';
import { Spring } from './entities/Spring';
import { Decoration } from './entities/Decoration';
import { ComboMessage } from './entities/ComboMessage';

const getRandomObstacleConfig = () => {
    const totalWeight = OBSTACLE_DEFINITIONS.reduce((sum, def) => sum + def.weight, 0);
    let random = Math.random() * totalWeight;
    for (const def of OBSTACLE_DEFINITIONS) {
        if (random < def.weight) {
            return def;
        }
        random -= def.weight;
    }
    // Fallback in case of floating point issues
    return OBSTACLE_DEFINITIONS[OBSTACLE_DEFINITIONS.length - 1];
};

export interface GameEngineState {
    gameRunning: boolean;
    canRestart: boolean;
    score: number;
    gameSpeed: number;
    lastTime: number;
    obstaclePool: Obstacle[];
    groundPool: GroundDetail[];
    sceneryPool: SceneryElement[];
    particlePool: Particle[];
    spawnTimer: number;
    groundSpawnTimer: number;
    scenerySpawnTimer: number;
    animationId: number;
    player: PlayerEntity;
    hasStarted: boolean;
    highScore: number;
    playerName: string;
    bgType: 'OCEAN' | 'RICE_FIELD';
    bgTimer: number;
    bgScrollX: number;
    shakeTimer: number;
    lastHitObstacleType: ObstacleType | null;
    explosionImages: HTMLImageElement[];
    fartImages: HTMLImageElement[];
    dogImage: HTMLImageElement | null;
    springPool: Spring[];
    springSpawnTimer: number;
    springImage: HTMLImageElement | null;
    springOutImage: HTMLImageElement | null;
    flashImages: HTMLImageElement[];
    cloudPool: Decoration[];
    cloudSpawnTimer: number;
    cloudImages: HTMLImageElement[];
    mountainPool: Decoration[];
    mountainSpawnTimer: number;
    mountainImage: HTMLImageElement | null;
    sparkImages: HTMLImageElement[];
    twirlImages: HTMLImageElement[];
    starImages: HTMLImageElement[];
    knockOffCombo: number;
    jumpCombo: number;
    comboMessagePool: ComboMessage[];
}

export interface GameEngineCallbacks {
    onStateChange: (state: GameEngineState) => void;
}

export interface GameEngine {
    getMutableState: () => GameEngineState;
    setPlayerName: (name: string) => void;
    setCanvas: (canvas: HTMLCanvasElement) => void;
    start: () => void;
    reset: () => void;
    handleJump: () => void;
    stop: () => void;
}

export const createGameEngine = (callbacks: GameEngineCallbacks): GameEngine => {
    let state: GameEngineState = {
        gameRunning: false,
        canRestart: false,
        score: 0,
        gameSpeed: GAME_CONFIG.INITIAL_SPEED,
        lastTime: 0,
        obstaclePool: Array.from({ length: 10 }, () => new Obstacle()),
        groundPool: Array.from({ length: 50 }, () => new GroundDetail()),
        sceneryPool: Array.from({ length: 15 }, () => new SceneryElement()),
        particlePool: Array.from({ length: 30 }, () => new Particle()),
        spawnTimer: 0,
        groundSpawnTimer: 0,
        scenerySpawnTimer: 0,
        animationId: 0,
        player: createBodyBuilder(),
        hasStarted: false,
        highScore: 0,
        playerName: 'LEGEND',
        bgType: 'OCEAN',
        bgTimer: 0,
        bgScrollX: 0,
        shakeTimer: 0,
        lastHitObstacleType: null,
        explosionImages: [],
        fartImages: [],
        dogImage: null,
        springPool: Array.from({ length: 5 }, () => new Spring()),
        springSpawnTimer: 5,
        springImage: null,
        springOutImage: null,
        flashImages: [],
        cloudPool: Array.from({ length: 10 }, () => new Decoration()),
        cloudSpawnTimer: 2,
        cloudImages: [],
        mountainPool: Array.from({ length: 5 }, () => new Decoration()),
        mountainSpawnTimer: 8,
        mountainImage: null,
        sparkImages: [],
        twirlImages: [],
        starImages: [],
        knockOffCombo: 0,
        jumpCombo: 0,
        comboMessagePool: Array.from({ length: 3 }, () => new ComboMessage())
    };

    // Pre-load explosion images
    const explosionPaths = Array.from({ length: 9 }, (_, i) => `./images/explosion0${i}.png`);
    loadImages(explosionPaths).then(imgs => {
        state.explosionImages = imgs;
    }).catch(err => console.error("Failed to load explosion images:", err));

    // Pre-load fart images
    const fartPaths = Array.from({ length: 9 }, (_, i) => `./images/fart0${i}.png`);
    loadImages(fartPaths).then(imgs => {
        state.fartImages = imgs;
    }).catch(err => console.error("Failed to load fart images:", err));

    // Pre-load dog image
    loadImages(['./images/animal-dog.png']).then(([img]) => {
        state.dogImage = img;
    }).catch(err => console.error("Failed to load dog image:", err));

    // Pre-load spring and flash images
    loadImages(['./images/spring.svg', './images/spring_out.svg']).then(([springImg, springOutImg]) => {
        state.springImage = springImg;
        state.springOutImage = springOutImg;
    }).catch(err => console.error("Failed to load spring images:", err));

    const flashPaths = Array.from({ length: 9 }, (_, i) => `./images/flash0${i}.png`);
    loadImages(flashPaths).then(imgs => {
        state.flashImages = imgs;
    }).catch(err => console.error("Failed to load flash images:", err));

    // Pre-load cloud images
    const cloudPaths = Array.from({ length: 8 }, (_, i) => `./images/cloud${i + 2}.png`);
    loadImages(cloudPaths).then(imgs => {
        state.cloudImages = imgs;
    }).catch(err => console.error("Failed to load cloud images:", err));

    // Pre-load mountain image
    loadImages(['./images/pointy_mountains.png']).then(([img]) => {
        state.mountainImage = img;
    }).catch(err => console.error("Failed to load mountain image:", err));

    // Pre-load combo effect images
    const sparkPaths = Array.from({ length: 7 }, (_, i) => `./images/spark_0${i + 1}.png`);
    loadImages(sparkPaths).then(imgs => state.sparkImages = imgs).catch(err => console.error("Failed to load spark images:", err));

    const twirlPaths = Array.from({ length: 3 }, (_, i) => `./images/twirl_0${i + 1}.png`);
    loadImages(twirlPaths).then(imgs => state.twirlImages = imgs).catch(err => console.error("Failed to load twirl images:", err));

    const starPaths = Array.from({ length: 9 }, (_, i) => `./images/star_0${i + 1}.png`);
    loadImages(starPaths).then(imgs => state.starImages = imgs).catch(err => console.error("Failed to load star images:", err));


    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;

    const spawnObstacle = (dt: number) => {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
            const r = Math.random();
            let count = r > 0.9 ? 2 : 1;
            let nextX = GAME_CONFIG.CANVAS_WIDTH;
            for (let i = 0; i < count; i++) {
                const config = getRandomObstacleConfig();
                const obstacle = getFromPool(state.obstaclePool, () => new Obstacle());
                obstacle.spawn(nextX, config);
                if (obstacle.type === ObstacleType.DOG) {
                    obstacle.dogImage = state.dogImage;
                }
                nextX += obstacle.width + (10 + Math.random() * 30);
            }
            state.spawnTimer = 1.5 + (count * 0.5) + Math.random() * 1.5;
            if (state.gameSpeed < GAME_CONFIG.MAX_SPEED) {
                state.gameSpeed += state.gameSpeed < 600 ? GAME_CONFIG.SPEED_INCREMENT : GAME_CONFIG.SPEED_INCREMENT / 2;
            }
        }
    };

    const spawnGroundDetails = (dt: number) => {
        state.groundSpawnTimer -= dt;
        if (state.groundSpawnTimer <= 0) {
            const detail = getFromPool(state.groundPool, () => new GroundDetail());
            detail.spawn(GAME_CONFIG.CANVAS_WIDTH);
            state.groundSpawnTimer = 0.05 + Math.random() * 0.2;
        }
    };

    const spawnScenery = (dt: number) => {
        state.scenerySpawnTimer -= dt;
        if (state.scenerySpawnTimer <= 0) {
            const scenery = getFromPool(state.sceneryPool, () => new SceneryElement());
            let type: 'PALM' | 'COCONUT' | 'BANANA' | 'SURFER' | 'BIG_VILLA' | 'FARMER';
            const r = Math.random();
            if (r > 0.6) {
                const trees: ('PALM' | 'COCONUT' | 'BANANA')[] = ['PALM', 'COCONUT', 'BANANA'];
                type = trees[Math.floor(Math.random() * trees.length)];
            } else {
                type = state.bgType === 'OCEAN' ? 'SURFER' : 'FARMER';
            }
            scenery.spawn(GAME_CONFIG.CANVAS_WIDTH + 200, type);
            state.scenerySpawnTimer = 0.6 + Math.random() * 1.5;
        }
    };

    const spawnSpring = (dt: number) => {
        state.springSpawnTimer -= dt;
        if (state.springSpawnTimer <= 0 && state.springImage && state.springOutImage) {
            const spring = getFromPool(state.springPool, () => new Spring());
            spring.spawn(GAME_CONFIG.CANVAS_WIDTH, state.springImage, state.springOutImage);
            // Spawn every 10-20 seconds
            state.springSpawnTimer = 10 + Math.random() * 10;
        }
    };

    const spawnCloud = (dt: number) => {
        state.cloudSpawnTimer -= dt;
        if (state.cloudSpawnTimer <= 0 && state.cloudImages.length > 0) {
            const cloud = getFromPool(state.cloudPool, () => new Decoration());
            const randomImage = state.cloudImages[Math.floor(Math.random() * state.cloudImages.length)];
            const y = 20 + Math.random() * 60;
            const scale = 0.5 + Math.random();
            const width = randomImage.width * scale;
            const height = randomImage.height * scale;
            const speedMultiplier = 0.1 + Math.random() * 0.2;
            cloud.spawn(GAME_CONFIG.CANVAS_WIDTH, y, width, height, randomImage, speedMultiplier, 'CLOUD');
            state.cloudSpawnTimer = 4 + Math.random() * 5; // Spawn a new cloud every 4-9 seconds
        }
    };

    const spawnMountain = (dt: number) => {
        state.mountainSpawnTimer -= dt;
        if (state.mountainSpawnTimer <= 0 && state.mountainImage && state.bgType === 'OCEAN') {
            const mountain = getFromPool(state.mountainPool, () => new Decoration());
            const height = 100 + Math.random() * 50;
            const width = (height / state.mountainImage.height) * state.mountainImage.width;
            const y = GAME_CONFIG.GROUND_Y - height + 20; // Sit behind the ocean line
            const speedMultiplier = 0.08; // Very slow for parallax
            mountain.spawn(GAME_CONFIG.CANVAS_WIDTH, y, width, height, state.mountainImage, speedMultiplier, 'MOUNTAIN');
            state.mountainSpawnTimer = 20 + Math.random() * 15; // Spawn a new mountain every 20-35 seconds
        }
    };

    const gameOver = () => {
        state.gameRunning = false;
        state.canRestart = false;
        if (state.score / 10 > state.highScore) {
            state.highScore = Math.floor(state.score / 10);
            localStorage.setItem('cangguJumpHighScore', state.highScore.toString());
        }
        SoundSynth.stopImmunityMusic();
        SoundSynth.stopMusic();
        SoundSynth.playRoar();

        // --- TRIGGER EXPLOSION ---
        if (state.explosionImages.length > 0) {
            const randomIndex = Math.floor(Math.random() * state.explosionImages.length);
            const explosionImg = state.explosionImages[randomIndex];
            const p = getFromPool(state.particlePool, () => new Particle());
            p.spawn(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2, '#fff', 'EXPLOSION', explosionImg);
        }

        callbacks.onStateChange({ ...state });
        setTimeout(() => {
            state.canRestart = true;
            callbacks.onStateChange({ ...state });
        }, 1000);
    };

    const runGameLoop = (timestamp: number) => {
        if (!state.gameRunning || !ctx || !canvas) return;

        if (!state.lastTime) state.lastTime = timestamp;
        const dt = Math.min((timestamp - state.lastTime) / 1000, 0.1);
        state.lastTime = timestamp;

        if (state.shakeTimer > 0) state.shakeTimer -= dt;
        ctx.save();
        if (state.shakeTimer > 0) {
            const shakeAmount = 5;
            ctx.translate((Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount);
        }

        ctx.fillStyle = GAME_CONFIG.COLORS.SKY;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const sunX = canvas.width - 120, sunY = 70;
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 50);
        sunGrad.addColorStop(0, '#fff9c4');
        sunGrad.addColorStop(0.4, '#fde68a');
        sunGrad.addColorStop(1, 'rgba(253, 230, 138, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
        ctx.fill();

        spawnMountain(dt);
        state.mountainPool.forEach(m => {
            if (m.active) {
                m.update(dt, state.gameSpeed);
                m.draw(ctx);
                // Volcano smoke effect
                if (m.type === 'MOUNTAIN' && m.smokeTimer !== undefined) {
                    m.smokeTimer -= dt;
                    if (m.smokeTimer <= 0) {
                        const p = getFromPool(state.particlePool, () => new Particle());
                        // Peak of the mountain
                        const smokeX = m.x + m.width * 0.45;
                        const smokeY = m.y + m.height * 0.1;
                        p.spawn(smokeX, smokeY, '#888', 'DUST');
                        m.smokeTimer = 1.5 + Math.random() * 2;
                    }
                }

            }
        });

        spawnCloud(dt);
        state.cloudPool.forEach(c => c.active && (c.update(dt, state.gameSpeed), c.draw(ctx)));

        state.bgTimer += dt;
        state.bgScrollX = (state.bgScrollX + state.gameSpeed * 0.2 * dt) % 1000;
        if (state.bgTimer > 15) {
            const scenery = getFromPool(state.sceneryPool, () => new SceneryElement());
            scenery.spawn(GAME_CONFIG.CANVAS_WIDTH + 300, 'BIG_VILLA');
            state.bgType = state.bgType === 'OCEAN' ? 'RICE_FIELD' : 'OCEAN';
            state.bgTimer = 0;
            state.scenerySpawnTimer = 2.5;
        }

        if (state.bgType === 'OCEAN') {
            ctx.fillStyle = GAME_CONFIG.COLORS.OCEAN;
            ctx.fillRect(0, 160, canvas.width, 40);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            for (let i = 0; i < 8; i++) {
                const wx = ((Date.now() / 2000) * 40 + i * 150) % (canvas.width + 200) - 100, wy = 162;
                ctx.beginPath(); ctx.moveTo(wx, wy + 5); ctx.lineTo(wx + 10, wy - 2); ctx.quadraticCurveTo(wx + 20, wy - 5, wx + 30, wy - 2); ctx.lineTo(wx + 40, wy + 5); ctx.fill();
            }
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            for (let i = 0; i < 5; i++) {
                const wx = ((Date.now() / 1200) * 80 + i * 220) % (canvas.width + 300) - 150, wy = 165;
                ctx.beginPath(); ctx.moveTo(wx, wy + 15); ctx.lineTo(wx + 20, wy - 5); ctx.quadraticCurveTo(wx + 35, wy - 15, wx + 50, wy - 5); ctx.quadraticCurveTo(wx + 65, wy + 5, wx + 80, wy + 15); ctx.fill();
            }
        } else {
            const levels = [{ y: 160, color: '#166534' }, { y: 175, color: '#15803d' }, { y: 190, color: '#16a34a' }];
            levels.forEach((level, idx) => {
                ctx.fillStyle = level.color;
                ctx.beginPath(); ctx.moveTo(0, level.y);
                const scrollOffset = (state.bgScrollX * (1 + idx * 0.2)) % 100;
                ctx.save(); ctx.translate(-scrollOffset, 0);
                for (let x = -100; x <= canvas.width + 200; x += 50) {
                    ctx.quadraticCurveTo(x + 25, level.y - 10, x + 50, level.y);
                }
                ctx.lineTo(canvas.width + 200, 200); ctx.lineTo(-100, 200); ctx.closePath(); ctx.fill(); ctx.restore();
            });
        }

        ctx.fillStyle = GAME_CONFIG.COLORS.SAND;
        ctx.fillRect(0, 200, canvas.width, 42);

        spawnScenery(dt);
        state.sceneryPool.forEach(s => s.active && (s.update(dt, state.gameSpeed), s.draw(ctx)));

        spawnSpring(dt);
        state.springPool.forEach(s => s.active && (s.update(dt, state.gameSpeed), s.draw(ctx)));

        ctx.strokeStyle = GAME_CONFIG.COLORS.PRIMARY;
        ctx.fillStyle = GAME_CONFIG.COLORS.PRIMARY;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, GAME_CONFIG.GROUND_Y); ctx.lineTo(canvas.width, GAME_CONFIG.GROUND_Y); ctx.stroke();

        spawnGroundDetails(dt);
        state.groundPool.forEach(d => d.active && (d.update(dt, state.gameSpeed), d.draw(ctx)));

        state.player.update(dt, () => SoundSynth.playStep(), () => {
            for (let i = 0; i < 8; i++) getFromPool(state.particlePool, () => new Particle()).spawn(state.player.x + state.player.width / 2, GAME_CONFIG.GROUND_Y, '#ddd', 'DUST');
        });
        state.player.draw(ctx);

        state.particlePool.forEach(p => p.active && (p.update(dt), p.draw(ctx)));

        state.comboMessagePool.forEach(c => c.active && (c.update(dt), c.draw(ctx)));

        for (let i = 0; i < 3; i++) {
            const hx = 25 + i * 35, hy = 25;
            ctx.fillStyle = i < state.player.lives ? '#ff5252' : '#444';
            ctx.beginPath(); ctx.moveTo(hx, hy + 5); ctx.bezierCurveTo(hx, hy, hx - 10, hy, hx - 10, hy + 5); ctx.bezierCurveTo(hx - 10, hy + 12, hx, hy + 18, hx, hy + 22); ctx.bezierCurveTo(hx, hy + 18, hx + 10, hy + 12, hx + 10, hy + 5); ctx.bezierCurveTo(hx + 10, hy, hx, hy, hx, hy + 5); ctx.fill();
        }

        if (state.player.powerUpTimer > 0) {
            ctx.fillStyle = 'cyan'; ctx.font = "10px 'Press Start 2P'"; ctx.textAlign = "left";
            ctx.fillText(`IMMUNITY: ${state.player.powerUpTimer.toFixed(1)}s`, 20, 55);
            if (state.player.powerUpTimer > 2) {
                ctx.fillStyle = GAME_CONFIG.COLORS.PINK_FLUO; ctx.font = "14px 'Press Start 2P'"; ctx.textAlign = "center";
                ctx.fillText("Protein-infused mode", canvas.width / 2, 80);
            }
        }

        spawnObstacle(dt);
        const padding = 15;
        state.obstaclePool.forEach(obs => {
            if (obs.active) {
                obs.update(dt, state.gameSpeed);
                obs.draw(ctx);
                if (state.player.x < obs.x + obs.width - padding && state.player.x + state.player.width > obs.x + padding && state.player.y < obs.y + obs.height && state.player.y + state.player.height >= obs.y && !obs.isCrashed) {
                    const isStompable = obs.type === ObstacleType.SCOOTER || obs.type === ObstacleType.TRIPLE_SCOOTER || obs.type === ObstacleType.INFLUENCER;
                    const isStomping = state.player.dy > 0 && (state.player.y + state.player.height) < (obs.y + 20);

                    if (obs.type === ObstacleType.PROTEIN_SHAKE) {
                        obs.active = false;
                        state.player.powerUpTimer = 7;
                        state.player.powerUpLevel = Math.min(state.player.powerUpLevel + 1, 2);
                        SoundSynth.startImmunityMusic();
                        for (let j = 0; j < 15; j++) getFromPool(state.particlePool, () => new Particle()).spawn(obs.x + obs.width / 2, obs.y + obs.height / 2, 'cyan', 'SPARKLE');
                    } else if (state.player.powerUpTimer > 0) {
                        obs.isCrashed = true;
                        obs.crashVX = 500 + Math.random() * 300;
                        obs.crashVY = -500 - Math.random() * 300;
                        state.shakeTimer = 0.1;

                        // --- KNOCK-OFF COMBO ---
                        if (state.sparkImages.length > 0) {
                            const p = getFromPool(state.particlePool, () => new Particle());
                            const sparkImg = state.sparkImages[Math.floor(Math.random() * state.sparkImages.length)];
                            p.spawn(obs.x + obs.width / 2, obs.y + obs.height / 2, '#fff', 'EXPLOSION', sparkImg);
                        }
                        state.jumpCombo = 0;
                        state.knockOffCombo++;
                        if (state.knockOffCombo >= 3) {
                            if (state.twirlImages.length > 0) {
                                const p = getFromPool(state.particlePool, () => new Particle());
                                const twirlImg = state.twirlImages[Math.floor(Math.random() * state.twirlImages.length)];
                                p.spawn(state.player.x + state.player.width / 2, state.player.y - 30, '#fff', 'EXPLOSION', twirlImg);
                            }
                            const msg = getFromPool(state.comboMessagePool, () => new ComboMessage());
                            msg.spawn(GAME_CONFIG.CANVAS_WIDTH / 2, 100, "Knockartist!");
                            state.knockOffCombo = 0;
                        }

                    } else if (isStompable && isStomping) {
                        obs.isCrashed = true;
                        obs.crashVX = 200 + Math.random() * 100;
                        obs.crashVY = -300 - Math.random() * 200;
                        state.player.dy = -GAME_CONFIG.JUMP_FORCE * 0.6; // Stomp bounce
                        SoundSynth.playHit();

                        // --- KNOCK-OFF COMBO ---
                        if (state.sparkImages.length > 0) {
                            const p = getFromPool(state.particlePool, () => new Particle());
                            const sparkImg = state.sparkImages[Math.floor(Math.random() * state.sparkImages.length)];
                            p.spawn(obs.x + obs.width / 2, obs.y + obs.height / 2, '#fff', 'EXPLOSION', sparkImg);
                        }
                        state.jumpCombo = 0;
                        state.knockOffCombo++;
                        if (state.knockOffCombo >= 3) {
                             if (state.twirlImages.length > 0) {
                                const p = getFromPool(state.particlePool, () => new Particle());
                                const twirlImg = state.twirlImages[Math.floor(Math.random() * state.twirlImages.length)];
                                p.spawn(state.player.x + state.player.width / 2, state.player.y - 30, '#fff', 'EXPLOSION', twirlImg);
                            }
                            const msg = getFromPool(state.comboMessagePool, () => new ComboMessage());
                            msg.spawn(GAME_CONFIG.CANVAS_WIDTH / 2, 100, "Knockartist!");
                            state.knockOffCombo = 0;
                        }

                    } else if (state.player.hitTimer <= 0) {
                        obs.active = false;
                        state.player.lives -= 1;
                        state.player.hitTimer = 1.0;
                        state.shakeTimer = 0.3;
                        state.knockOffCombo = 0;
                        state.jumpCombo = 0;

                        if (state.player.lives <= 0) {
                            state.lastHitObstacleType = obs.type;
                            gameOver();
                        } else {
                            if (obs.type === ObstacleType.DOG_POO && state.fartImages.length > 0) {
                                const randomIndex = Math.floor(Math.random() * state.fartImages.length);
                                const fartImg = state.fartImages[randomIndex];
                                const p = getFromPool(state.particlePool, () => new Particle());
                                p.spawn(state.player.x, state.player.y + state.player.height / 2, '#fff', 'EXPLOSION', fartImg);
                            } else if (state.explosionImages.length > 0) {
                                // --- TRIGGER EXPLOSION ON LIFE LOSS (non-fatal) ---
                                const randomIndex = Math.floor(Math.random() * state.explosionImages.length);
                                const explosionImg = state.explosionImages[randomIndex];
                                const p = getFromPool(state.particlePool, () => new Particle());
                                p.spawn(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2, '#fff', 'EXPLOSION', explosionImg);
                            }
                        }
                    }
                }

                // --- JUMP COMBO ---
                if (obs.active && !obs.isCrashed && !obs.isCleared && obs.x + obs.width < state.player.x) {
                    obs.isCleared = true;
                    // Ignore non-dangerous obstacles for combo
                    if (obs.type !== ObstacleType.PROTEIN_SHAKE) {
                        state.knockOffCombo = 0;
                        state.jumpCombo++;
                        if (state.jumpCombo >= 3) {
                            if (state.starImages.length > 0) {
                                const p = getFromPool(state.particlePool, () => new Particle());
                                const starImg = state.starImages[Math.floor(Math.random() * state.starImages.length)];
                                p.spawn(state.player.x + state.player.width / 2, state.player.y - 30, '#fff', 'EXPLOSION', starImg);
                            }
                            const msg = getFromPool(state.comboMessagePool, () => new ComboMessage());
                            msg.spawn(GAME_CONFIG.CANVAS_WIDTH / 2, 100, "Super Jumper!");
                            state.jumpCombo = 0;
                        }
                    }
                }
            }
        });

        // Spring collision
        state.springPool.forEach(spring => {
            if (spring.active && !spring.isSprung) {
                if (state.player.x < spring.x + spring.width &&
                    state.player.x + state.player.width > spring.x &&
                    state.player.y + state.player.height >= spring.y &&
                    state.player.y < spring.y + spring.height &&
                    state.player.dy > 0) // Must be falling onto it
                {
                    spring.use();
                    state.player.dy = -GAME_CONFIG.JUMP_FORCE * 2; // Super jump!
                    SoundSynth.playBoing();

                    // Flash effect
                    if (state.flashImages.length > 0) {
                        const randomIndex = Math.floor(Math.random() * state.flashImages.length);
                        const flashImg = state.flashImages[randomIndex];
                        const p = getFromPool(state.particlePool, () => new Particle());
                        p.spawn(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2, '#fff', 'EXPLOSION', flashImg);
                    }
                }
            }
        });

        if (state.gameRunning) {
            state.score += 60 * dt;
            ctx.font = "16px 'Press Start 2P'"; ctx.textAlign = "right";
            ctx.fillText(`HI ${Math.floor(state.score / 10)}`, canvas.width - 20, 30);
            ctx.restore();
            state.animationId = requestAnimationFrame(runGameLoop);
        } else {
            ctx.restore();
        }
        callbacks.onStateChange({ ...state });
    };

    const reset = () => {
        state.obstaclePool.forEach(p => p.active = false);
        state.groundPool.forEach(p => p.active = false);
        state.sceneryPool.forEach(p => p.active = false);
        state.springPool.forEach(p => p.active = false);
        state.cloudPool.forEach(p => p.active = false);
        state.mountainPool.forEach(p => p.active = false);
        state.comboMessagePool.forEach(p => p.active = false);
        for (let x = 0; x < GAME_CONFIG.CANVAS_WIDTH; x += 30 + Math.random() * 60) getFromPool(state.groundPool, () => new GroundDetail()).spawn(x);
        for (let x = 0; x < GAME_CONFIG.CANVAS_WIDTH; x += 150 + Math.random() * 200) getFromPool(state.sceneryPool, () => new SceneryElement()).spawn(x, 'PALM');
        state.score = 0;
        state.canRestart = false;
        state.gameSpeed = GAME_CONFIG.INITIAL_SPEED;
        state.spawnTimer = 0;
        state.groundSpawnTimer = 0;
        state.scenerySpawnTimer = 0;
        state.springSpawnTimer = 5;
        state.cloudSpawnTimer = 2;
        state.mountainSpawnTimer = 8;
        state.knockOffCombo = 0;
        state.jumpCombo = 0;
        state.bgTimer = 0;
        state.bgScrollX = 0;
        state.bgType = 'OCEAN';
        state.lastHitObstacleType = null;
        state.player.reset();
        state.lastTime = 0;
        state.gameRunning = true;
        state.hasStarted = true;
        callbacks.onStateChange({ ...state });
        SoundSynth.playMusic();
        runGameLoop(0);
    };

    return {
        getMutableState: () => state,
        setPlayerName: (name: string) => { state.playerName = name; },
        setCanvas: (c: HTMLCanvasElement) => {
            canvas = c;
            ctx = c.getContext('2d', { alpha: false });
        },
        start: () => {
            if (!state.hasStarted) {
                const savedHighScore = localStorage.getItem('cangguJumpHighScore');
                if (savedHighScore) state.highScore = parseInt(savedHighScore, 10);
                reset();
            }
        },
        reset,
        handleJump: () => {
            if (state.gameRunning) {
                if (state.player.jump()) SoundSynth.playJump();
            } else if (state.canRestart) {
                reset();
            }
        },
        stop: () => {
            state.gameRunning = false;
            cancelAnimationFrame(state.animationId);
        }
    };
};
