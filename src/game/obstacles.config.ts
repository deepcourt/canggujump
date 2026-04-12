/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GAME_CONFIG, ObstacleType } from './config';
import type { Obstacle } from './entities/Obstacle';

export interface ObstacleConfig {
    type: ObstacleType;
    width: number;
    height: number;
    y: number;
    weight: number;
    speedMultiplier?: number;
    customSpawn?: (obstacle: Obstacle) => void;
}

// Obstacle definitions have been moved to `src/game/difficulty.config.ts`
