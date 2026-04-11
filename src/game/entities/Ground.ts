/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GAME_CONFIG } from '../config';
import { getFromPool } from '../utils';

export class GroundDetail {
    active: boolean = false;
    x: number = 0;
    y: number = 0;
    width: number = 0;
    height: number = 2;

    spawn(startX: number) {
        this.x = startX;
        this.y = GAME_CONFIG.GROUND_Y + 3 + Math.random() * 45;
        this.width = Math.random() > 0.5 ? 3 : 7;
        this.active = true;
    }

    update(dt: number, speed: number) {
        if (!this.active) return;
        this.x -= speed * dt;
        if (this.x < -this.width) this.active = false;
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        // Optimization: Assume context color is already set to PRIMARY
        ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.width, this.height);
    }
}
