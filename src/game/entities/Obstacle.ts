/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GAME_CONFIG, ObstacleType } from '../config';
import { SoundSynth } from '../audio';
import type { ObstacleConfig } from '../obstacles.config';

export class Obstacle {
    active: boolean = false;
    x: number = 0;
    y: number = 0;
    width: number = 0;
    height: number = 0;
    type: ObstacleType = ObstacleType.DOG_POO;
    speedMultiplier: number = 1;
    cloudTimer: number = 0;
    smokeTimer: number = 0;
    hasSurfboard: boolean = false;
    honked: boolean = false;
    isCleared: boolean = false;
    isCrashed: boolean = false;
    crashVX: number = 0;
    crashVY: number = 0;
    crashRotation: number = 0;
    dogVariant: { color: string, scale: number } = { color: GAME_CONFIG.COLORS.DOG, scale: 1 };
    dogImage: HTMLImageElement | null = null;
    // Padel Ball logic
    padelVY: number = 0;
    padelIsBouncing: boolean = false;
    // Influencer logic
    selfieTimer: number = 0;
    isPosing: boolean = false;

    spawn(startX: number, config: ObstacleConfig) {
        this.x = startX;
        this.active = true;
        this.honked = false;
        this.isCleared = false;
        this.isCrashed = false;
        this.crashVX = 0;
        this.crashVY = 0;
        this.crashRotation = 0;
        this.selfieTimer = 0;
        this.isPosing = false;
        this.cloudTimer = 0;
        this.smokeTimer = 0;
        this.padelIsBouncing = false;
        this.padelVY = 0;

        this.type = config.type;
        this.width = config.width;
        this.height = config.height;
        this.y = config.y;
        this.speedMultiplier = config.speedMultiplier || 1;

        // Reset special properties before custom spawn
        this.hasSurfboard = false;
        this.dogVariant = { color: GAME_CONFIG.COLORS.DOG, scale: 1.0 };

        if (config.customSpawn) {
            config.customSpawn(this);
        }
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

        if (this.type === ObstacleType.PADEL_BALL && this.padelIsBouncing) {
            this.padelVY += GAME_CONFIG.GRAVITY * dt * 0.4; // A bit of gravity
            this.y += this.padelVY * dt;
            const groundY = GAME_CONFIG.GROUND_Y - this.height;
            if (this.y >= groundY) {
                this.y = groundY;
                this.padelVY *= -0.65; // Bounce with energy loss
            }
        }

        let currentSpeed = speed * this.speedMultiplier;
        
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
            if (this.dogImage) {
                ctx.drawImage(this.dogImage, ix, iy, this.width, this.height);
            }
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
        } else { // DOG_POO
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
