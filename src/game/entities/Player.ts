/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GAME_CONFIG } from '../config';
import { SoundSynth } from '../audio';

export interface PlayerEntity {
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

export const createBodyBuilder = (): PlayerEntity => ({
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
