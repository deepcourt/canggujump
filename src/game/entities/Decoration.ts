/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export class Decoration {
    active: boolean = false;
    x: number = 0;
    y: number = 0;
    width: number = 0;
    height: number = 0;
    speedMultiplier: number = 1;
    image: HTMLImageElement | null = null;
    type: 'CLOUD' | 'GRASS' | 'MOUNTAIN' | null = null;
    smokeTimer?: number;

    spawn(x: number, y: number, width: number, height: number, image: HTMLImageElement, speedMultiplier: number, type: 'CLOUD' | 'GRASS' | 'MOUNTAIN') {
        this.active = true;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.image = image;
        this.speedMultiplier = speedMultiplier;
        this.type = type;

        if (type === 'MOUNTAIN') {
            this.smokeTimer = Math.random() * 2; // Start with a random offset
        } else {
            this.smokeTimer = undefined;
        }
    }

    update(dt: number, gameSpeed: number) {
        if (!this.active) return;
        this.x -= gameSpeed * this.speedMultiplier * dt;

        if (this.x < -this.width) {
            this.active = false;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active || !this.image) return;
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
}
