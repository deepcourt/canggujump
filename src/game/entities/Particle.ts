/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GAME_CONFIG } from '../config';
import { getFromPool } from '../utils';

export class Particle {
    active: boolean = false;
    x: number = 0;
    y: number = 0;
    vx: number = 0;
    vy: number = 0;
    life: number = 0;
    maxLife: number = 0;
    color: string = '#fff';
    size: number = 2;
    type: 'DUST' | 'SPARKLE' | 'EXPLOSION' = 'DUST';
    image: HTMLImageElement | null = null;
    rotation: number = 0;
    rotationSpeed: number = 0;

    spawn(x: number, y: number, color: string, type: 'DUST' | 'SPARKLE' | 'EXPLOSION', image: HTMLImageElement | null = null) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.active = true;
        this.image = image;

        if (type === 'DUST') {
            this.vx = (Math.random() - 0.5) * 100;
            this.vy = -Math.random() * 50;
            this.maxLife = 0.5 + Math.random() * 0.5;
            this.size = 2 + Math.random() * 4;
        } else if (type === 'SPARKLE') {
            this.vx = (Math.random() - 0.5) * 200;
            this.vy = (Math.random() - 0.5) * 200;
            this.maxLife = 0.8 + Math.random() * 0.4;
            this.size = 2 + Math.random() * 3;
        } else { // EXPLOSION
            this.vx = (Math.random() - 0.5) * 50;
            this.vy = (Math.random() - 0.5) * 50;
            this.maxLife = 1.0;
            this.size = 100 + Math.random() * 50;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 2;
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
        } else if (this.type === 'SPARKLE') {
            this.vx *= 0.98;
            this.vy *= 0.98;
        } else { // EXPLOSION
            this.rotation += this.rotationSpeed * dt;
            this.vx *= 0.95;
            this.vy *= 0.95;
        }

        this.life -= dt;
        if (this.life <= 0) this.active = false;
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;

        if (this.type === 'EXPLOSION' && this.image) {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            // Draw centered
            ctx.drawImage(this.image, -this.size/2, -this.size/2, this.size, this.size);
        } else {
            ctx.fillStyle = this.color;
            if (this.type === 'SPARKLE') {
                // Draw a small star/cross
                ctx.fillRect(this.x - this.size/2, this.y - this.size/6, this.size, this.size/3);
                ctx.fillRect(this.x - this.size/6, this.y - this.size/2, this.size/3, this.size);
            } else { // DUST
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}

