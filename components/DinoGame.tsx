/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import { GAME_CONFIG, ObstacleType, GAME_OVER_MESSAGES } from '../game/config';
import { SoundSynth } from '../src/game/audio';

// --- TYPES & INTERFACES ---

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

interface GameEngineState {
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

interface PlayerEntity {
    x: number;
    y: number;
    width: number;
    height: number;
    dy: number;
    grounded: boolean;
    jumpTimer: number;
    legState: boolean;
    animTimer: number;
    powerUpTimer: number;
    powerUpLevel: number;
    lives: number;
    hitTimer: number;
    // Juice
    squashTimer: number;
    stretchTimer: number;
    jump: () => boolean;
    update: (dt: number, onStep?: () => void, onLand?: () => void) => void;
    draw: (ctx: CanvasRenderingContext2D) => void;
    reset: () => void;
}

// --- CONSTANTS ---

// --- BACKGROUND CLASSES ---

class SceneryElement {
    active: boolean = false;
    x: number = 0;
    y: number = 0;
    type: 'PALM' | 'COCONUT' | 'BANANA' | 'SURFER' | 'BIG_VILLA' | 'FARMER' = 'PALM';
    speedMult: number = 0.5;
    variant: number = 0;
    scale: number = 1;

    spawn(startX: number, type: 'PALM' | 'COCONUT' | 'BANANA' | 'SURFER' | 'BIG_VILLA' | 'FARMER') {
        this.x = startX;
        this.type = type;
        this.active = true;
        this.variant = Math.floor(Math.random() * 3);
        // Much more size variety
        this.scale = 0.4 + Math.random() * 2.1;
        
        if (type === 'PALM' || type === 'COCONUT' || type === 'BANANA') {
            this.y = GAME_CONFIG.GROUND_Y - 10;
            this.speedMult = 0.6;
        } else if (type === 'BIG_VILLA') {
            this.y = GAME_CONFIG.GROUND_Y - 10;
            this.speedMult = 0.55;
            this.scale = 1.2; // Always big
        } else if (type === 'FARMER') {
            this.y = 170 + Math.random() * 20;
            this.speedMult = 0.2; // Slow farmers
            this.scale = 0.8;
        } else {
            this.y = 175; // Ocean level
            this.speedMult = 0.35;
        }
    }

    update(dt: number, speed: number) {
        if (!this.active) return;
        this.x -= speed * this.speedMult * dt;
        if (this.x < -600) this.active = false;
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        const ix = Math.floor(this.x);
        const iy = Math.floor(this.y);

        if (this.type === 'PALM') {
            ctx.save();
            ctx.translate(ix, iy);
            ctx.scale(this.scale, this.scale);
            // Trunk
            ctx.fillStyle = '#5d4037';
            ctx.beginPath();
            ctx.moveTo(-5, 0);
            ctx.quadraticCurveTo(-10, -40, 0, -80);
            ctx.lineTo(5, -80);
            ctx.quadraticCurveTo(10, -40, 5, 0);
            ctx.fill();
            // Fronds
            ctx.fillStyle = '#2e7d32';
            for (let i = 0; i < 8; i++) {
                ctx.save();
                ctx.translate(0, -80);
                ctx.rotate((i * Math.PI) / 4 + Math.sin(Date.now() / 1000 + this.x) * 0.1);
                ctx.beginPath();
                ctx.ellipse(20, 0, 25, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        } else if (this.type === 'COCONUT') {
            ctx.save();
            ctx.translate(ix, iy);
            ctx.scale(this.scale, this.scale);
            // Tall thin trunk
            ctx.fillStyle = '#4e342e';
            ctx.fillRect(-3, -100, 6, 100);
            // Leaves
            ctx.fillStyle = '#1b5e20';
            for (let i = 0; i < 6; i++) {
                ctx.save();
                ctx.translate(0, -100);
                ctx.rotate((i * Math.PI) / 3 + Math.sin(Date.now() / 800) * 0.05);
                ctx.beginPath();
                ctx.ellipse(15, 5, 20, 4, 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            // Coconuts
            ctx.fillStyle = '#3e2723';
            ctx.beginPath();
            ctx.arc(-4, -95, 4, 0, Math.PI * 2);
            ctx.arc(4, -95, 4, 0, Math.PI * 2);
            ctx.arc(0, -90, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (this.type === 'BANANA') {
            ctx.save();
            ctx.translate(ix, iy);
            ctx.scale(this.scale, this.scale);
            // Thick green trunk
            ctx.fillStyle = '#8bc34a';
            ctx.fillRect(-6, -40, 12, 40);
            // Broad leaves
            ctx.fillStyle = '#4caf50';
            for (let i = 0; i < 5; i++) {
                ctx.save();
                ctx.translate(0, -40);
                ctx.rotate((i * Math.PI) / 2.5 - 0.5);
                ctx.beginPath();
                ctx.ellipse(15, 0, 25, 12, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            // Bananas
            ctx.fillStyle = '#ffeb3b';
            ctx.fillRect(-2, -30, 4, 10);
            ctx.restore();
        } else if (this.type === 'SURFER') {
            const wave = Math.sin(Date.now() / 400 + this.x / 40) * 8;
            
            // Draw Wave BEHIND surfer
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.moveTo(ix - 60, iy + wave + 15);
            ctx.lineTo(ix - 40, iy + wave - 5);
            ctx.quadraticCurveTo(ix - 25, iy + wave - 15, ix - 10, iy + wave - 5);
            ctx.quadraticCurveTo(ix + 5, iy + wave + 5, ix + 20, iy + wave + 15);
            ctx.fill();

            // Spray
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath();
            ctx.arc(ix + 25, iy + wave + 5, 5, 0, Math.PI * 2);
            ctx.arc(ix + 35, iy + wave + 8, 3, 0, Math.PI * 2);
            ctx.fill();
            // Board
            ctx.fillStyle = '#f43f5e'; // Pink board
            ctx.beginPath();
            ctx.ellipse(ix, iy + wave, 25, 5, 0.1, 0, Math.PI * 2);
            ctx.fill();
            // Person
            ctx.fillStyle = GAME_CONFIG.COLORS.TANNED;
            ctx.fillRect(ix - 5, iy - 25 + wave, 6, 20); // Body
            ctx.beginPath();
            ctx.arc(ix - 2, iy - 30 + wave, 5, 0, Math.PI * 2); // Head
            ctx.fill();
            // Extended Arms
            ctx.strokeStyle = GAME_CONFIG.COLORS.TANNED;
            ctx.lineWidth = 3;
            ctx.beginPath();
            // Back arm
            ctx.moveTo(ix - 5, iy - 20 + wave);
            ctx.lineTo(ix - 25, iy - 15 + wave);
            // Front arm
            ctx.moveTo(ix + 1, iy - 20 + wave);
            ctx.lineTo(ix + 25, iy - 15 + wave);
            ctx.stroke();
        } else if (this.type === 'FARMER') {
            ctx.save();
            ctx.translate(ix, iy);
            ctx.scale(this.scale, this.scale);
            
            // Working animation (bobbing)
            const bob = Math.sin(Date.now() / 300) * 2;
            ctx.translate(0, bob);

            // Body
            ctx.fillStyle = '#334155';
            ctx.fillRect(-4, -15, 8, 15);
            // Head
            ctx.fillStyle = GAME_CONFIG.COLORS.TANNED;
            ctx.beginPath();
            ctx.arc(0, -20, 5, 0, Math.PI * 2);
            ctx.fill();
            // Caping (Conical Hat)
            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.moveTo(-12, -20);
            ctx.lineTo(0, -32);
            ctx.lineTo(12, -20);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else if (this.type === 'BIG_VILLA') {
            ctx.save();
            ctx.translate(ix, iy);
            ctx.scale(this.scale, this.scale);
            
            // Stone Base
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(-80, -10, 160, 10);
            
            // Pillars (Bamboo/Wood)
            ctx.fillStyle = '#451a03';
            ctx.fillRect(-60, -60, 8, 50);
            ctx.fillRect(52, -60, 8, 50);
            ctx.fillRect(-20, -60, 6, 50);
            ctx.fillRect(14, -60, 6, 50);

            // Traditional Roof (Multi-tiered Thatch)
            ctx.fillStyle = '#713f12';
            // Bottom Tier (Dramatic curves)
            ctx.beginPath();
            ctx.moveTo(-100, -60);
            ctx.quadraticCurveTo(0, -100, 100, -60);
            ctx.lineTo(90, -75);
            ctx.quadraticCurveTo(0, -110, -90, -75);
            ctx.closePath();
            ctx.fill();
            
            // Top Tier
            ctx.beginPath();
            ctx.moveTo(-60, -85);
            ctx.quadraticCurveTo(0, -130, 60, -85);
            ctx.lineTo(50, -95);
            ctx.quadraticCurveTo(0, -140, -50, -95);
            ctx.closePath();
            ctx.fill();

            // Bamboo Texture
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            for(let i=-80; i<80; i+=12) {
                ctx.beginPath();
                ctx.moveTo(i, -60);
                ctx.quadraticCurveTo(0, -100, 0, -130);
                ctx.stroke();
            }

            ctx.restore();
        }
    }
}

// --- GAME ENTITIES (POOLED) ---

class GroundDetail {
    active: boolean = false;
    x: number = 0;
    y: number = 0;
    width: number = 0;
    height: number = 2;

    spawn(startX: number) {
        this.x = startX;
        this.y = GAME_CONFIG.GROUND_Y + 3 + Math.random() * 45;
        this.width = Math.random() > 0.5 ? 3 : 7;
        this.active = true;
    }

    update(dt: number, speed: number) {
        if (!this.active) return;
        this.x -= speed * dt;
        if (this.x < -this.width) this.active = false;
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        // Optimization: Assume context color is already set to PRIMARY
        ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.width, this.height);
    }
}

class Obstacle {
    active: boolean = false;
    x: number = 0;
    y: number = 210;
    width: number = 0;
    height: number = 0;
    type: ObstacleType = ObstacleType.DOG_POO;
    cloudTimer: number = 0;
    smokeTimer: number = 0;
    hasSurfboard: boolean = false;
    honked: boolean = false;
    isCrashed: boolean = false;
    crashVX: number = 0;
    crashVY: number = 0;
    crashRotation: number = 0;
    dogVariant: { color: string, scale: number } = { color: GAME_CONFIG.COLORS.DOG, scale: 1 };
    // Influencer logic
    selfieTimer: number = 0;
    isPosing: boolean = false;

    spawn(startX: number) {
        this.x = startX;
        this.honked = false;
        this.isCrashed = false;
        this.crashVX = 0;
        this.crashVY = 0;
        this.crashRotation = 0;
        this.selfieTimer = 0;
        this.isPosing = false;
        const r = Math.random();
        if (r > 0.90) { // Slightly increased threshold for new items
            this.type = ObstacleType.PROTEIN_SHAKE;
            this.width = 30;
            this.height = 50;
            this.y = GAME_CONFIG.GROUND_Y - this.height - 80; // Higher up
        } else if (r > 0.83) {
            this.type = ObstacleType.INFLUENCER;
            this.width = 40;
            this.height = 65;
            this.y = GAME_CONFIG.GROUND_Y - this.height;
        } else if (r > 0.77) {
            this.type = ObstacleType.PADEL_BALL;
            this.width = 40;
            this.height = 40;
            this.y = 100; // Flying high
        } else if (r > 0.71) {
            this.type = ObstacleType.BIRD;
            this.width = 30;
            this.height = 20;
            this.y = 50 + Math.random() * 30;
        } else if (r > 0.62) {
            this.type = ObstacleType.TRIPLE_SCOOTER;
            this.width = 85;
            this.height = 55;
            this.y = GAME_CONFIG.GROUND_Y - this.height;
        } else if (r > 0.52) {
            this.type = ObstacleType.SCOOTER;
            this.width = 70;
            this.height = 55;
            this.y = GAME_CONFIG.GROUND_Y - this.height;
            this.hasSurfboard = Math.random() > 0.5;
        } else if (r > 0.42) {
            this.type = ObstacleType.DOG;
            const dogR = Math.random();
            if (dogR > 0.7) {
                this.dogVariant = { color: '#4B5563', scale: 0.7 }; // Small grey dog
            } else if (dogR > 0.4) {
                this.dogVariant = { color: '#374151', scale: 1.1 }; // Large dark grey dog
            } else {
                this.dogVariant = { color: GAME_CONFIG.COLORS.DOG, scale: 1.0 }; // Standard brown dog
            }
            this.width = 55 * this.dogVariant.scale;
            this.height = 35 * this.dogVariant.scale;
            this.y = GAME_CONFIG.GROUND_Y - this.height;
        } else if (r > 0.28) {
            this.type = ObstacleType.POTHOLE;
            const size = Math.random();
            this.width = size > 0.6 ? 80 : 40; // Big or small
            this.height = 10;
            this.y = GAME_CONFIG.GROUND_Y;
        } else if (r > 0.15) {
            this.type = ObstacleType.CANANG_SARI;
            this.width = 30;
            this.height = 15;
            this.y = GAME_CONFIG.GROUND_Y - this.height;
        } else {
            this.type = ObstacleType.DOG_POO;
            this.width = 25;
            this.height = 12;
            this.y = GAME_CONFIG.GROUND_Y - this.height;
        }
        this.active = true;
        this.cloudTimer = 0;
        this.smokeTimer = 0;
    }

    update(dt: number, speed: number) {
        if (!this.active) return;
        
        if (this.isCrashed) {
            this.x += this.crashVX * dt;
            this.y += this.crashVY * dt;
            this.crashVY += 2000 * dt; // Gravity for crashed objects
            this.crashRotation += 10 * dt;
            if (this.y > 600) this.active = false;
            return;
        }

        let currentSpeed = speed;
        if (this.type === ObstacleType.BIRD) currentSpeed *= 1.2;
        if (this.type === ObstacleType.DOG) currentSpeed *= 1.4;
        if (this.type === ObstacleType.PADEL_BALL) currentSpeed *= 1.8;
        
        if (this.type === ObstacleType.INFLUENCER) {
            if (this.isPosing) {
                this.selfieTimer -= dt;
                currentSpeed = 0;
                if (this.selfieTimer <= 0) {
                    this.isPosing = false;
                }
            } else {
                // Randomly stop to take a selfie if in view
                if (this.x < 600 && this.x > 200 && Math.random() < 0.01) {
                    this.isPosing = true;
                    this.selfieTimer = 1.0 + Math.random() * 1.0;
                }
            }
        }

        this.x -= currentSpeed * dt;
        this.cloudTimer += dt;
        this.smokeTimer += dt;

        // Honk logic
        if ((this.type === ObstacleType.SCOOTER || this.type === ObstacleType.TRIPLE_SCOOTER) && !this.honked && this.x < 500) {
            SoundSynth.playHonk();
            this.honked = true;
        }

        // Bark logic
        if (this.type === ObstacleType.DOG && !this.honked && this.x < 500) {
            SoundSynth.playBark(this.dogVariant.scale);
            this.honked = true; // Reusing honked for bark
        }

        // Padel Whoosh
        if (this.type === ObstacleType.PADEL_BALL && !this.honked && this.x < 600) {
            SoundSynth.playPadelWhoosh();
            this.honked = true;
        }

        if (this.x < -this.width - 200) this.active = false;
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        const ix = Math.floor(this.x);
        const iy = Math.floor(this.y);

        if (this.isCrashed) {
            ctx.save();
            ctx.translate(ix + this.width / 2, iy + this.height / 2);
            ctx.rotate(this.crashRotation);
            ctx.translate(-(ix + this.width / 2), -(iy + this.height / 2));
        }

        if (this.type === ObstacleType.SCOOTER || this.type === ObstacleType.TRIPLE_SCOOTER) {
            // Vespa/Scoopy style - Facing Left
            if (this.type === ObstacleType.TRIPLE_SCOOTER) {
                ctx.fillStyle = '#FB923C'; // Orange for triple
            } else if (this.hasSurfboard) {
                ctx.fillStyle = '#3b82f6'; // Blue for surfer
            } else {
                ctx.fillStyle = GAME_CONFIG.COLORS.SCOOTER; // Yellow for single
            }
            
            // Body curve
            ctx.beginPath();
            ctx.roundRect(ix + 15, iy + 25, 45, 20, 10);
            ctx.fill();
            // Front shield
            ctx.fillRect(ix + 5, iy + 15, 15, 30);
            // Handlebar
            ctx.fillStyle = '#333';
            ctx.fillRect(ix + 2, iy + 12, 12, 4);
            
            // Wheels
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(ix + 15, iy + 45, 10, 0, Math.PI * 2);
            ctx.arc(ix + 50, iy + 45, 10, 0, Math.PI * 2);
            ctx.fill();

            // Surfboard variant
            if (this.hasSurfboard) {
                ctx.fillStyle = '#FF6B6B';
                ctx.beginPath();
                ctx.ellipse(ix + 35, iy + 30, 35, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Riders
            const riderCount = this.type === ObstacleType.TRIPLE_SCOOTER ? 3 : 1;
            for (let i = 0; i < riderCount; i++) {
                const offset = i * 12;
                ctx.fillStyle = GAME_CONFIG.COLORS.SKIN;
                ctx.fillRect(ix + 25 + offset, iy + 5, 18, 25); // Torso
                
                // Sphere Helmet
                ctx.fillStyle = GAME_CONFIG.COLORS.HELMET;
                ctx.beginPath();
                ctx.arc(ix + 34 + offset, iy - 1, 10, 0, Math.PI * 2);
                ctx.fill();
                // Visor
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(ix + 24 + offset, iy - 5, 12, 6);
            }

            // Smoke effect (More prominent)
            if (Math.floor(this.smokeTimer * 20) % 2 === 0) {
                ctx.fillStyle = 'rgba(150,150,150,0.5)';
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    const sx = ix + 60 + i * 10;
                    const sy = iy + 40 - (this.smokeTimer % 0.4) * 30 - i * 5;
                    ctx.arc(sx, sy, 4 + i * 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Cloud - Only for solo scooter (not surfer, not triple)
            if (!this.isCrashed && this.type === ObstacleType.SCOOTER && !this.hasSurfboard) {
                const cloudX = ix - 40;
                const cloudY = iy - 50;
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(cloudX, cloudY, 25, 0, Math.PI * 2);
                ctx.arc(cloudX + 30, cloudY - 10, 20, 0, Math.PI * 2);
                ctx.arc(cloudX + 60, cloudY, 25, 0, Math.PI * 2);
                ctx.arc(cloudX + 30, cloudY + 15, 20, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#333';
                ctx.font = "10px 'Press Start 2P'";
                ctx.textAlign = "center";
                ctx.fillText("Bike..", cloudX + 30, cloudY - 5);
                ctx.fillText("Bike bike!!!", cloudX + 30, cloudY + 10);
            }

        } else if (this.type === ObstacleType.INFLUENCER) {
            // Influencer Character
            ctx.fillStyle = GAME_CONFIG.COLORS.TANNED;
            // Legs
            const walk = this.isPosing ? 0 : Math.sin(Date.now() / 100) * 5;
            ctx.fillRect(ix + 12, iy + 45, 6, 20 + walk);
            ctx.fillRect(ix + 22, iy + 45, 6, 20 - walk);
            
            // Body (Crop top)
            ctx.fillStyle = '#ff6b6b';
            ctx.fillRect(ix + 10, iy + 25, 20, 15);
            ctx.fillStyle = GAME_CONFIG.COLORS.TANNED;
            ctx.fillRect(ix + 10, iy + 40, 20, 5); // Belly
            
            // Head
            ctx.beginPath();
            ctx.arc(ix + 20, iy + 15, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Sunglasses
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(ix + 15, iy + 12, 12, 4);
            
            // Hair (Influencer bun)
            ctx.fillStyle = '#4b2c20';
            ctx.beginPath();
            ctx.arc(ix + 20, iy + 5, 5, 0, Math.PI * 2);
            ctx.fill();

            // Phone/Camera
            ctx.fillStyle = '#333';
            const armAngle = this.isPosing ? -0.5 : 0.5;
            ctx.save();
            ctx.translate(ix + 25, iy + 30);
            ctx.rotate(armAngle);
            ctx.fillRect(0, 0, 15, 6); // Arm
            ctx.fillStyle = '#000';
            ctx.fillRect(12, -4, 5, 10); // Phone
            
            // Selfie Flash Effect
            if (this.isPosing && Math.floor(Date.now() / 100) % 3 === 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(15, 0, 30, 0, Math.PI * 2);
                ctx.fill();
                // Flash star
                ctx.fillStyle = '#fff';
                ctx.fillRect(10, -10, 10, 20);
                ctx.fillRect(5, -5, 20, 10);
            }
            ctx.restore();

        } else if (this.type === ObstacleType.DOG) {
            // More realistic dog - Facing Left (towards player)
            ctx.fillStyle = this.dogVariant.color;
            const s = this.dogVariant.scale;
            // Body
            ctx.beginPath();
            ctx.roundRect(ix + 10 * s, iy + 10 * s, 40 * s, 18 * s, 5 * s);
            ctx.fill();
            // Head (Facing Left)
            ctx.beginPath();
            ctx.roundRect(ix, iy, 15 * s, 15 * s, 3 * s);
            ctx.fill();
            // Ears
            ctx.fillRect(ix + 5 * s, iy - 5 * s, 5 * s, 8 * s);
            // Tail
            ctx.beginPath();
            ctx.moveTo(ix + 50 * s, iy + 15 * s);
            ctx.quadraticCurveTo(ix + 65 * s, iy + 5 * s, ix + 60 * s, iy + 20 * s);
            ctx.strokeStyle = this.dogVariant.color;
            ctx.lineWidth = 4 * s;
            ctx.stroke();
            // Legs
            const legOffset = Math.sin(Date.now() / 60) * 8;
            ctx.fillRect(ix + 15 * s, iy + 25 * s, 6 * s, 10 * s + legOffset);
            ctx.fillRect(ix + 35 * s, iy + 25 * s, 6 * s, 10 * s - legOffset);
        } else if (this.type === ObstacleType.BIRD) {
            ctx.fillStyle = GAME_CONFIG.COLORS.BIRD;
            ctx.beginPath();
            const wingY = Math.sin(Date.now() / 100) * 10;
            ctx.moveTo(ix, iy);
            ctx.lineTo(ix + 15, iy + wingY);
            ctx.lineTo(ix + 30, iy);
            ctx.stroke();
        } else if (this.type === ObstacleType.PADEL_BALL) {
            // Traces
            ctx.fillStyle = 'rgba(153, 255, 0, 0.3)';
            for (let i = 1; i < 5; i++) {
                ctx.beginPath();
                ctx.arc(ix + 20 + i * 15, iy + 20, 20 - i * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.fillStyle = GAME_CONFIG.COLORS.PADEL;
            ctx.beginPath();
            ctx.arc(ix + 20, iy + 20, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = 'black';
            ctx.font = "8px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText("PADEL", ix + 20, iy + 25);
        } else if (this.type === ObstacleType.CANANG_SARI) {
            // Spiritual Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff5252';
            
            ctx.fillStyle = GAME_CONFIG.COLORS.CANANG;
            ctx.beginPath();
            ctx.roundRect(ix, iy, 30, 15, 3); // Basket
            ctx.fill();
            
            ctx.shadowBlur = 0;

            // Flowers (More detailed)
            ctx.fillStyle = '#ff5252'; ctx.beginPath(); ctx.arc(ix + 8, iy + 5, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FACC15'; ctx.beginPath(); ctx.arc(ix + 22, iy + 5, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#4ADE80'; ctx.beginPath(); ctx.arc(ix + 15, iy + 10, 4, 0, Math.PI * 2); ctx.fill();

            // Incense Smoke (Fluid)
            const smokeY = iy - 10 - (this.smokeTimer % 1) * 30;
            const smokeX = ix + 15 + Math.sin(this.smokeTimer * 5) * 5;
            ctx.fillStyle = 'rgba(200,200,200,0.4)';
            ctx.beginPath();
            ctx.arc(smokeX, smokeY, 4, 0, Math.PI * 2);
            ctx.fill();

            // Spirit Particles (Floating up)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            for(let i=0; i<3; i++) {
                const px = ix + 5 + (i * 10) + Math.sin(Date.now() / 300 + i) * 5;
                const py = iy - 5 - ((Date.now() / 10 + i * 20) % 40);
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.type === ObstacleType.PROTEIN_SHAKE) {
            // Glow effect
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'cyan';
            
            // Giant Bottle Shape
            ctx.fillStyle = GAME_CONFIG.COLORS.PROTEIN;
            ctx.beginPath();
            ctx.roundRect(ix, iy + 10, 30, 40, 5); // Main body
            ctx.fill();
            ctx.fillRect(ix + 7, iy, 16, 10); // Cap
            
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = 'white';
            ctx.font = "6px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText("PROTEIN", ix + 15, iy + 35);

            // Green Arrow pointing down
            const arrowY = iy - 30 + Math.sin(Date.now() / 150) * 5;
            ctx.fillStyle = '#4ADE80';
            ctx.beginPath();
            ctx.moveTo(ix + 5, arrowY);
            ctx.lineTo(ix + 25, arrowY);
            ctx.lineTo(ix + 15, arrowY + 15);
            ctx.fill();
        } else if (this.type === ObstacleType.POTHOLE) {
            ctx.fillStyle = GAME_CONFIG.COLORS.POTHOLE;
            ctx.beginPath();
            ctx.ellipse(ix + this.width / 2, iy, this.width / 2, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = GAME_CONFIG.COLORS.POO;
            ctx.fillRect(ix, iy + 5, 25, 7);
            ctx.fillRect(ix + 5, iy, 15, 5);
            // Smell lines
            ctx.strokeStyle = 'rgba(139, 69, 19, 0.5)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const sx = ix + 5 + i * 8;
                const sy = iy - 5 - Math.sin(Date.now() / 200 + i) * 5;
                ctx.beginPath();
                ctx.moveTo(sx, iy);
                ctx.lineTo(sx, sy);
                ctx.stroke();
            }
            // Flies
            ctx.fillStyle = 'black';
            for (let i = 0; i < 4; i++) {
                const fx = ix + 5 + Math.sin(Date.now() / 100 + i) * 10;
                const fy = iy - 10 + Math.cos(Date.now() / 150 + i) * 10;
                ctx.fillRect(fx, fy, 2, 2);
            }
        }

        if (this.isCrashed) {
            ctx.restore();
        }
    }
}

class Particle {
    active: boolean = false;
    x: number = 0;
    y: number = 0;
    vx: number = 0;
    vy: number = 0;
    life: number = 0;
    maxLife: number = 0;
    color: string = '#fff';
    size: number = 2;
    type: 'DUST' | 'SPARKLE' = 'DUST';

    spawn(x: number, y: number, color: string, type: 'DUST' | 'SPARKLE') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.active = true;
        
        if (type === 'DUST') {
            this.vx = (Math.random() - 0.5) * 100;
            this.vy = -Math.random() * 50;
            this.maxLife = 0.5 + Math.random() * 0.5;
            this.size = 2 + Math.random() * 4;
        } else {
            this.vx = (Math.random() - 0.5) * 200;
            this.vy = (Math.random() - 0.5) * 200;
            this.maxLife = 0.8 + Math.random() * 0.4;
            this.size = 2 + Math.random() * 3;
        }
        this.life = this.maxLife;
    }

    update(dt: number) {
        if (!this.active) return;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        if (this.type === 'DUST') {
            this.vy += 100 * dt; // Slight gravity for dust
            this.vx *= 0.95; // Friction
        } else {
            this.vx *= 0.98;
            this.vy *= 0.98;
        }

        this.life -= dt;
        if (this.life <= 0) this.active = false;
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        if (this.type === 'SPARKLE') {
            // Draw a small star/cross
            ctx.fillRect(this.x - this.size/2, this.y - this.size/6, this.size, this.size/3);
            ctx.fillRect(this.x - this.size/6, this.y - this.size/2, this.size/3, this.size);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// Pool Helpers
const getFromPool = <T extends { active: boolean }>(pool: T[], factory: () => T): T => {
    const item = pool.find(p => !p.active);
    if (item) return item;
    const newItem = factory();
    pool.push(newItem);
    return newItem;
};

const createBodyBuilder = (): PlayerEntity => ({
    x: GAME_CONFIG.DINO_START_X,
    y: GAME_CONFIG.DINO_GROUND_Y,
    width: 65,
    height: 80,
    dy: 0,
    grounded: false,
    jumpTimer: 0,
    legState: false,
    animTimer: 0,
    powerUpTimer: 0,
    powerUpLevel: 0,
    lives: 3,
    hitTimer: 0,
    squashTimer: 0,
    stretchTimer: 0,
    
    reset() {
        this.y = GAME_CONFIG.DINO_GROUND_Y - 20;
        this.dy = 0;
        this.grounded = true;
        this.jumpTimer = 0;
        this.legState = false;
        this.animTimer = 0;
        this.powerUpTimer = 0;
        this.powerUpLevel = 0;
        this.lives = 3;
        this.hitTimer = 0;
        this.squashTimer = 0;
        this.stretchTimer = 0;
    },

    draw(ctx: CanvasRenderingContext2D) {
        const sizeMult = this.powerUpLevel === 2 ? 1.6 : (this.powerUpLevel === 1 ? 1.3 : 1);
        
        let w = this.width * sizeMult;
        let h = this.height * sizeMult;

        // Apply Squash and Stretch
        if (this.squashTimer > 0) {
            const factor = 1 + (this.squashTimer / 0.15) * 0.2;
            w *= factor;
            h /= factor;
        } else if (this.stretchTimer > 0) {
            const factor = 1 + (this.stretchTimer / 0.15) * 0.2;
            w /= factor;
            h *= factor;
        }

        const ix = Math.floor(this.x);
        const iy = Math.floor(this.y - (h - this.height));

        // Hit Animation (Flashing red) - Rounded and smooth
        if (this.hitTimer > 0 && Math.floor(this.hitTimer * 10) % 2 === 0) {
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.roundRect(ix - 10, iy - 10, w + 20, h + 20, 20);
            ctx.fill();
            ctx.restore();
        }

        // Immunity Glow
        if (this.powerUpTimer > 0) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.powerUpLevel === 2 ? 'gold' : 'cyan';
        }

        // Character Outline (To stand out)
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2 * sizeMult;
        ctx.lineJoin = 'round';

        // Skin color for the bodybuilder
        ctx.fillStyle = GAME_CONFIG.COLORS.SKIN;
        
        // Massive Torso (Muscles) - Rounded for smoothness
        ctx.beginPath();
        ctx.roundRect(ix + (12/65)*w, iy + (15/80)*h, (40/65)*w, (38/80)*h, 10 * sizeMult);
        ctx.fill();
        ctx.stroke();
        
        // Detailed Tattoos (Tribal/Curved)
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2 * sizeMult;
        // Chest Tattoo (More detailed tribal)
        ctx.beginPath();
        ctx.moveTo(ix + (18/65)*w, iy + (22/80)*h);
        ctx.quadraticCurveTo(ix + (32/65)*w, iy + (35/80)*h, ix + (46/65)*w, iy + (22/80)*h);
        ctx.stroke();
        
        // Massive Arms (Biceps) - Rounded
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2 * sizeMult;
        ctx.fillStyle = GAME_CONFIG.COLORS.SKIN;
        ctx.beginPath();
        ctx.roundRect(ix - (5/65)*w, iy + (15/80)*h, (18/65)*w, (35/80)*h, 8 * sizeMult); // Left arm
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(ix + (52/65)*w, iy + (15/80)*h, (18/65)*w, (35/80)*h, 8 * sizeMult); // Right arm
        ctx.fill();
        ctx.stroke();
        
        // Head - Rounded
        ctx.beginPath();
        ctx.roundRect(ix + (24/65)*w, iy - (8/80)*h, (20/65)*w, (24/80)*h, 6 * sizeMult);
        ctx.fill();
        ctx.stroke();
        
        if (this.powerUpTimer > 0) {
            // Pink Helmet for powered-up state
            ctx.fillStyle = GAME_CONFIG.COLORS.PINK_FLUO;
            ctx.beginPath();
            ctx.roundRect(ix + (22/65)*w, iy - (15/80)*h, (24/65)*w, (15/80)*h, 5 * sizeMult);
            ctx.fill();
        } else {
            // Ray-Ban Style Sunglasses
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.roundRect(ix + (26/65)*w, iy - (2/80)*h, (7/65)*w, (6/80)*h, [2, 2, 4, 4]);
            ctx.roundRect(ix + (35/65)*w, iy - (2/80)*h, (7/65)*w, (6/80)*h, [2, 2, 4, 4]);
            ctx.fill();
        }
        
        // Shorts - PINK FLUO (Guaranteed)
        ctx.fillStyle = '#FF00FF'; 
        ctx.beginPath();
        ctx.roundRect(ix + (12/65)*w, iy + (50/80)*h, (40/65)*w, (15/80)*h, 4 * sizeMult);
        ctx.fill();
        ctx.stroke();
        
        // Legs Animation - Rounded
        ctx.fillStyle = GAME_CONFIG.COLORS.SKIN;
        const legW = (12/65)*w;
        ctx.beginPath();
        if (!this.grounded) {
            ctx.roundRect(ix + (18/65)*w, iy + (65/80)*h, legW, (15/80)*h, 4);
            ctx.roundRect(ix + (40/65)*w, iy + (65/80)*h, legW, (15/80)*h, 4);
        } else if (this.legState) {
            ctx.roundRect(ix + (18/65)*w, iy + (65/80)*h, legW, (20/80)*h, 4);
            ctx.roundRect(ix + (40/65)*w, iy + (65/80)*h, legW, (10/80)*h, 4);
        } else {
            ctx.roundRect(ix + (18/65)*w, iy + (65/80)*h, legW, (10/80)*h, 4);
            ctx.roundRect(ix + (40/65)*w, iy + (65/80)*h, legW, (20/80)*h, 4);
        }
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
    },

    jump() {
        if (this.grounded && this.jumpTimer <= 0) {
            this.dy = -GAME_CONFIG.JUMP_FORCE;
            this.grounded = false;
            this.jumpTimer = 0.1;
            this.stretchTimer = 0.15; // Start stretch
            return true;
        }
        return false;
    },

    update(dt: number, onStep?: () => void, onLand?: () => void) {
        if (this.jumpTimer > 0) this.jumpTimer -= dt;
        if (this.powerUpTimer > 0) {
            this.powerUpTimer -= dt;
            if (this.powerUpTimer <= 0) {
                this.powerUpLevel = 0;
                SoundSynth.stopImmunityMusic();
            }
        }
        
        if (this.hitTimer > 0) {
            this.hitTimer -= dt;
        }

        if (this.squashTimer > 0) this.squashTimer -= dt;
        if (this.stretchTimer > 0) this.stretchTimer -= dt;

        this.animTimer += dt;
        if (this.animTimer > 0.1) {
            this.legState = !this.legState;
            this.animTimer = 0;
            if (this.grounded && onStep) onStep();
        }

        const wasGrounded = this.grounded;

        this.dy += GAME_CONFIG.GRAVITY * dt;
        this.y += this.dy * dt;

        const groundY = GAME_CONFIG.GROUND_Y - this.height;
        if (this.y >= groundY) {
            this.y = groundY;
            this.dy = 0;
            this.grounded = true;
            if (!wasGrounded) {
                this.squashTimer = 0.15; // Landed!
                if (onLand) onLand();
            }
        } else {
            this.grounded = false;
            // Stretch at the peak
            if (Math.abs(this.dy) < 100) {
                this.stretchTimer = 0.1;
            }
        }
    }
});


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
