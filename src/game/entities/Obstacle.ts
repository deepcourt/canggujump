/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GAME_CONFIG, ObstacleType, GAME_OVER_MESSAGES } from '../config';
import { SoundSynth } from '../audio';
import { getFromPool } from '../utils';

export class Obstacle {
    active: boolean = false;
    x: number = 0;
    y: number = 0;
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
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;

        const ix = Math.floor(this.x);
        const iy = Math.floor(this.y);

        ctx.save();
        ctx.translate(ix + this.width/2, iy + this.height/2);
        ctx.rotate(this.crashRotation);
        ctx.scale(this.isCrashed ? 0.7 : 1, this.isCrashed ? 0.7 : 1);

        if (this.isCrashed) {
            ctx.fillStyle = '#555'; // Darker grey for crashed
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        }

        switch(this.type) {
            case ObstacleType.SCOOTER:
            case ObstacleType.TRIPLE_SCOOTER:
                // Scooter Body
                ctx.fillStyle = this.type === ObstacleType.TRIPLE_SCOOTER ? '#FFA500' : GAME_CONFIG.COLORS.SCOOTER; // Orange or Yellow
                ctx.beginPath();
                ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height * 0.6, 10);
                ctx.fill();
                // Wheels
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(-this.width/2 + 20, this.height/2 - 5, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(this.width/2 - 20, this.height/2 - 5, 10, 0, Math.PI * 2);
                ctx.fill();
                // Handlebars
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(-this.width/2, -this.height/2);
                ctx.lineTo(-this.width/2 + 10, -this.height/2 - 10);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(this.width/2, -this.height/2);
                ctx.lineTo(this.width/2 - 10, -this.height/2 - 10);
                ctx.stroke();

                if (this.hasSurfboard) {
                    ctx.fillStyle = '#F87171'; // Reddish-pink surfboard
                    ctx.beginPath();
                    ctx.roundRect(-15, -this.height/2 - 25, 30, 8, 3);
                    ctx.fill();
                }
                break;
            case ObstacleType.POTHOLE:
                ctx.fillStyle = GAME_CONFIG.COLORS.POTHOLE;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            case ObstacleType.DOG_POO:
                ctx.fillStyle = GAME_CONFIG.COLORS.POO;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            case ObstacleType.BIRD:
                ctx.fillStyle = '#333';
                const birdScale = this.width / 30; // Base width is 30
                // Body
                ctx.beginPath();
                ctx.ellipse(0, -5, 15 * birdScale, 10 * birdScale, 0, 0, Math.PI * 2);
                ctx.fill();
                // Tail
                ctx.beginPath();
                ctx.moveTo(-15 * birdScale, -5);
                ctx.lineTo(-30 * birdScale, -10);
                ctx.lineTo(-30 * birdScale, 0);
                ctx.closePath();
                ctx.fill();
                // Beak
                ctx.beginPath();
                ctx.moveTo(15 * birdScale, -5);
                ctx.lineTo(25 * birdScale, -8);
                ctx.lineTo(25 * birdScale, -2);
                ctx.closePath();
                ctx.fill();
                break;
            case ObstacleType.CANANG_SARI:
                ctx.fillStyle = GAME_CONFIG.COLORS.CANANG;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                // Small flowers/details
                ctx.fillStyle = '#FF4500'; // Orange-red accent
                ctx.beginPath();
                ctx.arc(-8, -5, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(8, -5, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
            case ObstacleType.PROTEIN_SHAKE:
                ctx.fillStyle = GAME_CONFIG.COLORS.PROTEIN;
                ctx.beginPath();
                ctx.roundRect(-this.width/2, -this.height/2, this.width, this.height * 0.7, 5);
                ctx.fill();
                // Cap
                ctx.beginPath();
                ctx.roundRect(-this.width/2, -this.height/2 - 5, this.width, 5, 3);
                ctx.fill();
                break;
            case ObstacleType.PADEL_BALL:
                ctx.fillStyle = GAME_CONFIG.COLORS.PADEL;
                ctx.beginPath();
                ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
                ctx.fill();
                // Lines
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-this.width/2 + 5, 0);
                ctx.lineTo(this.width/2 - 5, 0);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, -this.width/2 + 5);
                ctx.lineTo(0, this.width/2 - 5);
                ctx.stroke();
                break;
            case ObstacleType.INFLUENCER:
                // Influencer Character
                ctx.fillStyle = GAME_CONFIG.COLORS.TANNED;
                // Legs
                const walk = this.isPosing ? 0 : Math.sin(Date.now() / 100) * 5;
                ctx.fillRect(-17, 10, 6, 20 + walk);
                ctx.fillRect(5, 10, 6, 20 - walk);
                
                // Body (Crop top)
                ctx.fillStyle = '#ff6b6b';
                ctx.fillRect(-15, -5, 30, 15);
                ctx.fillStyle = GAME_CONFIG.COLORS.TANNED;
                ctx.fillRect(-15, 10, 30, 5); // Belly
                
                // Head
                ctx.beginPath();
                ctx.arc(0, -15, 10, 0, Math.PI * 2);
                ctx.fill();
                
                // Sunglasses
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(-10, -12, 12, 4);
                
                // Hair (Influencer bun)
                ctx.fillStyle = '#4b2c20';
                ctx.beginPath();
                ctx.arc(0, -25, 5, 0, Math.PI * 2);
                ctx.fill();

                // Phone/Camera
                ctx.fillStyle = '#333';
                const armAngle = this.isPosing ? -0.5 : 0.5;
                ctx.save();
                ctx.translate(10, -15);
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
                break;
            case ObstacleType.DOG:
                // More realistic dog - Facing Left (towards player)
                ctx.fillStyle = this.dogVariant.color;
                const s = this.dogVariant.scale;
                // Body
                ctx.beginPath();
                ctx.roundRect(-25 * s, -20 * s, 50 * s, 30 * s, 15 * s);
                ctx.fill();
                // Head
                ctx.beginPath();
                ctx.arc(35 * s, -15 * s, 15 * s, 0, Math.PI * 2);
                ctx.fill();
                // Tail
                ctx.beginPath();
                ctx.moveTo(-25 * s, 0 * s);
                ctx.quadraticCurveTo(-40 * s, 10 * s, -45 * s, 0 * s);
                ctx.stroke();
                // Legs
                ctx.beginPath();
                ctx.roundRect(-15 * s, 10 * s, 10 * s, 20 * s, 5 * s);
                ctx.fill();
                ctx.beginPath();
                ctx.roundRect(5 * s, 10 * s, 10 * s, 20 * s, 5 * s);
                ctx.fill();
                break;
        }

        ctx.restore();
    }
}
