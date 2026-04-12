/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GAME_CONFIG } from '../config';

export class Spring {
    active: boolean = false;
    x: number = 0;
    y: number = 0;
    width: number = 40;
    height: number = 20;
    isSprung: boolean = false;
    sprungTimer: number = 0;

    image: HTMLImageElement | null = null;
    imageOut: HTMLImageElement | null = null;

    spawn(startX: number, image: HTMLImageElement, imageOut: HTMLImageElement) {
        this.x = startX;
        this.y = GAME_CONFIG.GROUND_Y - this.height;
        this.active = true;
        this.isSprung = false;
        this.sprungTimer = 0;
        this.image = image;
        this.imageOut = imageOut;
    }

    update(dt: number, speed: number) {
        if (!this.active) return;
        this.x -= speed * dt;

        if (this.sprungTimer > 0) {
            this.sprungTimer -= dt;
            if (this.sprungTimer <= 0) {
                this.active = false; // Disappear after use
            }
        }

        if (this.x < -this.width) {
            this.active = false;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        const img = this.isSprung ? this.imageOut : this.image;
        if (img) {
            // When sprung, the spring extends upwards. Adjust y and height for drawing.
            const drawHeight = this.isSprung ? this.height * 2.5 : this.height;
            const drawY = this.isSprung ? this.y - (this.height * 1.5) : this.y;
            ctx.drawImage(img, this.x, drawY, this.width, drawHeight);
        }
    }

    use() {
        if (!this.isSprung) {
            this.isSprung = true;
            this.sprungTimer = 0.5; // Show sprung state for 0.5s before disappearing
        }
    }
}
