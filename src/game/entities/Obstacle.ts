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
    helmetColor: string = GAME_CONFIG.COLORS.HELMET;
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
    // Pothole logic
    potholeDebris: { angle: number, distance: number, size: number, color: string }[] = [];
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
        this.potholeDebris = [];

        this.type = config.type;
        this.width = config.width;
        this.height = config.height;
        this.y = config.y;
        this.speedMultiplier = config.speedMultiplier || 1;

        // Reset special properties before custom spawn
        this.hasSurfboard = false;
        this.helmetColor = GAME_CONFIG.COLORS.HELMET;
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
                if (this.x < 600 && this.x > 200 && Math.random() < 0.015) {
                    this.isPosing = true;
                    this.selfieTimer = 1.0 + Math.random() * 1.0;
                    SoundSynth.playCameraShutter();
                }
            }
        }

        this.x -= currentSpeed * dt;
        this.cloudTimer += dt;
        this.smokeTimer += dt;

        // Honk logic
        if ((this.type === ObstacleType.SCOOTER || this.type === ObstacleType.TRIPLE_SCOOTER) && !this.honked && this.x < 500) {
            if (this.type === ObstacleType.SCOOTER && !this.hasSurfboard) {
                SoundSynth.playBikeHorn();
            } else {
                SoundSynth.playHonk();
            }
            this.honked = true;
        }

        // Bark logic
        if (this.type === ObstacleType.DOG && !this.honked && this.x < 500) {
            SoundSynth.playBark();
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
            // Vespa/Scoopy style - Facing Left with more realistic curves
            const bodyColor = this.type === ObstacleType.TRIPLE_SCOOTER ? '#FB923C' : (this.hasSurfboard ? '#3b82f6' : GAME_CONFIG.COLORS.SCOOTER);
            
            // Wheels
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(ix + 15, iy + 45, 10, 0, Math.PI * 2);
            ctx.arc(ix + 55, iy + 45, 10, 0, Math.PI * 2);
            ctx.fill();

            // Scooter Body
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.moveTo(ix + 15, iy + 45); // Start at front wheel
            ctx.quadraticCurveTo(ix + 5, iy + 20, ix + 20, iy + 10); // Rounded front shield
            ctx.lineTo(ix + 35, iy + 10); // Top part
            ctx.lineTo(ix + 40, iy + 20); // Down to seat
            ctx.quadraticCurveTo(ix + 50, iy + 45, ix + 70, iy + 40); // Rear fender
            ctx.lineTo(ix + 55, iy + 45); // To back wheel
            ctx.closePath();
            ctx.fill();

            // Handlebar & Seat
            ctx.fillStyle = '#333';
            ctx.fillRect(ix + 18, iy + 8, 4, 8); // Handlebar stem
            ctx.fillRect(ix + 15, iy + 8, 10, 3); // Handlebar
            ctx.fillStyle = '#5a4a42';
            ctx.beginPath();
            ctx.roundRect(ix + 35, iy + 15, 20, 8, 3);
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
                ctx.fillStyle = this.helmetColor;
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
            // Influencer Character - More detailed and stylized
            const walk = this.isPosing ? 0 : Math.sin(Date.now() / 100) * 2;
            const iyWalk = iy + walk;

            // Legs - More shapely
            ctx.fillStyle = GAME_CONFIG.COLORS.TANNED;
            ctx.beginPath();
            ctx.roundRect(ix + 12, iyWalk + 40, 8, 25, 4); // Left leg
            ctx.roundRect(ix + 22, iyWalk + 40, 8, 25, 4); // Right leg
            ctx.fill();

            // Body (bikini-style)
            // Hips/Bottoms
            ctx.fillStyle = '#ec4899'; // Hot pink
            ctx.beginPath();
            ctx.moveTo(ix + 10, iyWalk + 35);
            ctx.lineTo(ix + 30, iyWalk + 35);
            ctx.lineTo(ix + 25, iyWalk + 45);
            ctx.lineTo(ix + 15, iyWalk + 45);
            ctx.closePath();
            ctx.fill();
            // Torso
            ctx.fillStyle = GAME_CONFIG.COLORS.TANNED;
            ctx.beginPath();
            ctx.moveTo(ix + 15, iyWalk + 35);
            ctx.lineTo(ix + 25, iyWalk + 35);
            ctx.lineTo(ix + 28, iyWalk + 25);
            ctx.lineTo(ix + 12, iyWalk + 25);
            ctx.closePath();
            ctx.fill();
            // Top
            ctx.fillStyle = '#ec4899'; // Hot pink
            ctx.beginPath();
            ctx.moveTo(ix + 12, iyWalk + 25);
            ctx.lineTo(ix + 28, iyWalk + 25);
            ctx.lineTo(ix + 20, iyWalk + 30);
            ctx.closePath();
            ctx.fill();
            
            // Head
            ctx.fillStyle = GAME_CONFIG.COLORS.TANNED;
            ctx.beginPath();
            ctx.arc(ix + 20, iyWalk + 15, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Long flowing hair
            ctx.fillStyle = '#fde047'; // Blonde
            ctx.beginPath();
            ctx.moveTo(ix + 20, iyWalk + 5);
            ctx.quadraticCurveTo(ix + 5, iyWalk + 20, ix + 10, iyWalk + 40);
            ctx.quadraticCurveTo(ix + 20, iyWalk + 30, ix + 30, iyWalk + 40);
            ctx.quadraticCurveTo(ix + 35, iyWalk + 20, ix + 20, iyWalk + 5);
            ctx.fill();
            
            // Face details
            // Big Lips
            ctx.fillStyle = '#f43f5e'; // Rose red
            ctx.beginPath();
            ctx.arc(ix + 20, iyWalk + 18, 3, 0, Math.PI, false);
            ctx.fill();
            // Sunglasses
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.roundRect(ix + 13, iyWalk + 12, 14, 4, 2);
            ctx.fill();

            // Phone/Camera
            const armAngle = this.isPosing ? -0.5 : 0.5;
            ctx.save();
            ctx.translate(ix + 25, iyWalk + 30);
            ctx.rotate(armAngle);
            ctx.fillStyle = GAME_CONFIG.COLORS.TANNED;
            ctx.fillRect(0, 0, 15, 5); // Arm
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

            // Green leaf basket
            ctx.fillStyle = GAME_CONFIG.COLORS.CANANG;
            ctx.beginPath();
            ctx.moveTo(ix, iy);
            ctx.lineTo(ix + 30, iy);
            ctx.lineTo(ix + 25, iy + 15);
            ctx.lineTo(ix + 5, iy + 15);
            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = 0;

            // Leaf details
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ix + 15, iy);
            ctx.lineTo(ix + 15, iy + 15);
            ctx.moveTo(ix + 5, iy);
            ctx.lineTo(ix + 25, iy + 15);
            ctx.stroke();

            // Flowers (More detailed)
            ctx.fillStyle = '#ff5252'; ctx.beginPath(); ctx.arc(ix + 8, iy + 5, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FACC15'; ctx.beginPath(); ctx.arc(ix + 22, iy + 5, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ix + 15, iy + 10, 4, 0, Math.PI * 2); ctx.fill();

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
            const centerX = ix + this.width / 2;
            // Main hole - dark
            ctx.fillStyle = '#2a2a2a';
            ctx.beginPath();
            ctx.ellipse(centerX, iy, this.width / 2, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Inner shadow for depth
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(centerX, iy, this.width / 2.2, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Debris/stones around the edge
            this.potholeDebris.forEach(debris => {
                const x = centerX + Math.cos(debris.angle) * debris.distance;
                const y = iy + Math.sin(debris.angle) * 8; // Match ellipse shape
                ctx.fillStyle = debris.color;
                ctx.beginPath();
                ctx.arc(x, y, debris.size, 0, Math.PI * 2);
                ctx.fill();
            });

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
