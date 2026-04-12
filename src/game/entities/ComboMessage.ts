/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export class ComboMessage {
    active: boolean = false;
    x: number = 0;
    y: number = 0;
    text: string = '';
    life: number = 0;
    maxLife: number = 1.5; // seconds

    spawn(x: number, y: number, text: string) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.text = text;
        this.life = this.maxLife;
    }

    update(dt: number) {
        if (!this.active) return;
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;

        const lifeRatio = this.life / this.maxLife;
        const scale = 1 + (1 - lifeRatio) * 0.5; // Grow slightly
        const alpha = Math.sin(lifeRatio * Math.PI); // Fade in and out smoothly

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${24 * scale}px 'Press Start 2P'`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 5;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillStyle = '#FFC107'; // Amber color
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}
