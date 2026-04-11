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
    width: number = 0;
    height: number = 0;
    type: 'PALM' | 'COCONUT' | 'BANANA' | 'SURFER' | 'BIG_VILLA' | 'FARMER';
    variant: number = 0; // For variations like tree type or farmer appearance
    scale: number = 1;

    spawn(startX: number, type: 'PALM' | 'COCONUT' | 'BANANA' | 'SURFER' | 'BIG_VILLA' | 'FARMER') {
        this.x = startX;
        this.type = type;
        this.active = true;
        this.variant = Math.floor(Math.random() * 3); // For different appearances
        
        // Scale and position based on type
        switch (type) {
            case 'PALM':
                this.width = 80; this.height = 120; this.y = GAME_CONFIG.GROUND_Y - this.height; this.scale = 1.0; break;
            case 'COCONUT':
                this.width = 60; this.height = 90; this.y = GAME_CONFIG.GROUND_Y - this.height; this.scale = 1.0; break;
            case 'BANANA':
                this.width = 70; this.height = 100; this.y = GAME_CONFIG.GROUND_Y - this.height; this.scale = 1.0; break;
            case 'SURFER':
                this.width = 50; this.height = 70; this.y = GAME_CONFIG.GROUND_Y - this.height; this.scale = 1.2; break;
            case 'BIG_VILLA':
                this.width = 300; this.height = 200; this.y = GAME_CONFIG.GROUND_Y - this.height - 50; this.scale = 1.0; break;
            case 'FARMER':
                this.width = 40; this.height = 65; this.y = GAME_CONFIG.GROUND_Y - this.height; this.scale = 1.1; break;
        }
    }

    update(dt: number, speed: number) {
        if (!this.active) return;
        this.x -= speed * dt * (this.type === 'BIG_VILLA' ? 0.2 : 1); // Villas move slower
        if (this.x < -this.width - 200) this.active = false; // Remove when off-screen
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;

        const ix = Math.floor(this.x);
        const iy = Math.floor(this.y);
        const s = this.scale;
        const w = this.width * s;
        const h = this.height * s;

        ctx.save();
        ctx.translate(ix + w / 2, iy + h / 2);
        ctx.scale(s, s);
        ctx.lineJoin = 'round';

        switch (this.type) {
            case 'PALM':
                // Trunk
                ctx.fillStyle = '#6B460E';
                ctx.beginPath();
                ctx.roundRect(-20, 0, 40, 80, 10);
                ctx.fill();
                // Leaves (variant 0, 1, 2)
                ctx.fillStyle = '#228B22'; // Forest green
                ctx.beginPath();
                ctx.moveTo(-40, -30); ctx.quadraticCurveTo(0, -60, 40, -30); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(-35, -50); ctx.quadraticCurveTo(0, -80, 35, -50); ctx.fill();
                break;
            case 'COCONUT':
                // Trunk
                ctx.fillStyle = '#6B460E';
                ctx.beginPath();
                ctx.roundRect(-15, 0, 30, 60, 7);
                ctx.fill();
                // Coconuts
                ctx.fillStyle = '#8B4513'; // Brown
                ctx.beginPath();
                ctx.arc(-10, -35, 8, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath();
                ctx.arc(10, -35, 8, 0, Math.PI * 2); ctx.fill();
                break;
            case 'BANANA':
                // Trunk
                ctx.fillStyle = '#8FBC8F'; // Dark sea green
                ctx.beginPath();
                ctx.roundRect(-20, 0, 40, 70, 8);
                ctx.fill();
                // Leaves
                ctx.fillStyle = '#90EE90'; // Light green
                ctx.beginPath();
                ctx.moveTo(-30, -20); ctx.quadraticCurveTo(0, -50, 30, -20); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(-25, -40); ctx.quadraticCurveTo(0, -70, 25, -40); ctx.fill();
                break;
            case 'SURFER':
                // Surfer Body
                ctx.fillStyle = GAME_CONFIG.COLORS.TANNED;
                ctx.beginPath();
                ctx.roundRect(-15, -30, 30, 40, 10);
                ctx.fill();
                // Surfboard
                ctx.fillStyle = '#F87171'; // Reddish-pink
                ctx.beginPath();
                ctx.roundRect(-25, -50, 50, 10, 5);
                ctx.fill();
                break;
            case 'BIG_VILLA':
                // Main building
                ctx.fillStyle = '#E0E0E0'; // Light grey
                ctx.beginPath();
                ctx.roundRect(-100, -100, 200, 150, 15);
                ctx.fill();
                // Roof
                ctx.fillStyle = '#B85C5C'; // Terracotta red
                ctx.beginPath();
                ctx.moveTo(-110, -100);
                ctx.lineTo(0, -160);
                ctx.lineTo(110, -100);
                ctx.closePath();
                ctx.fill();
                // Windows
                ctx.fillStyle = '#ADD8E6'; // Light blue
                ctx.beginPath();
                ctx.roundRect(-80, -70, 50, 50, 5);
                ctx.fill();
                ctx.beginPath();
                ctx.roundRect(30, -70, 50, 50, 5);
                ctx.fill();
                break;
            case 'FARMER':
                // Farmer Body (similar to player but simpler)
                ctx.fillStyle = GAME_CONFIG.COLORS.SKIN;
                ctx.beginPath();
                ctx.roundRect(-15, -30, 30, 40, 10);
                ctx.fill();
                // Shirt
                ctx.fillStyle = '#87CEEB'; // Sky blue
                ctx.beginPath();
                ctx.roundRect(-15, -15, 30, 20, 5);
                ctx.fill();
                // Hat
                ctx.fillStyle = '#D2B48C'; // Tan hat
                ctx.beginPath();
                ctx.roundRect(-20, -45, 40, 15, 7);
                ctx.fill();
                break;
        }
        ctx.restore();
    }
}
