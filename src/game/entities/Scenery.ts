/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GAME_CONFIG } from '../config';
import { getFromPool } from '../utils';

export class SceneryElement {
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
