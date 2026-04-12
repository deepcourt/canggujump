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

export const OBSTACLE_DEFINITIONS: ObstacleConfig[] = [
    {
        type: ObstacleType.DOG_POO,
        width: 25,
        height: 12,
        y: GAME_CONFIG.GROUND_Y - 12,
        weight: 15,
    },
    {
        type: ObstacleType.CANANG_SARI,
        width: 30,
        height: 15,
        y: GAME_CONFIG.GROUND_Y - 15,
        weight: 13,
    },
    {
        type: ObstacleType.POTHOLE,
        width: 40, // default
        height: 10,
        y: GAME_CONFIG.GROUND_Y,
        weight: 14,
        customSpawn: (obs) => {
            obs.width = Math.random() > 0.6 ? 80 : 40;
        }
    },
    {
        type: ObstacleType.DOG,
        width: 55,
        height: 35,
        y: GAME_CONFIG.GROUND_Y - 35,
        weight: 10,
        speedMultiplier: 1.4,
    },
    {
        type: ObstacleType.SCOOTER,
        width: 70,
        height: 55,
        y: GAME_CONFIG.GROUND_Y - 55 - 2, // Raise slightly to sit on top of grass
        weight: 10,
        customSpawn: (obs) => {
            obs.hasSurfboard = Math.random() > 0.5;
        }
    },
    {
        type: ObstacleType.TRIPLE_SCOOTER,
        width: 85,
        height: 55,
        y: GAME_CONFIG.GROUND_Y - 55 - 2, // Raise slightly to sit on top of grass
        weight: 9,
    },
    {
        type: ObstacleType.BIRD,
        width: 30,
        height: 20,
        y: 50, // default
        weight: 6,
        speedMultiplier: 1.2,
        customSpawn: (obs) => {
            obs.y = 50 + Math.random() * 30;
        }
    },
    {
        type: ObstacleType.PADEL_BALL,
        width: 25,
        height: 25,
        y: GAME_CONFIG.GROUND_Y - 25, // Default to rolling on the ground
        weight: 5, // A bit less frequent
        speedMultiplier: 1.1,
        customSpawn: (obs) => {
            // 40% chance to be a bouncer
            if (Math.random() > 0.6) {
                obs.padelIsBouncing = true;
                obs.y = 100; // Start higher up
                obs.padelVY = -150; // Initial velocity
            }
        }
    },
    {
        type: ObstacleType.INFLUENCER,
        width: 40,
        height: 65,
        y: GAME_CONFIG.GROUND_Y - 65 - 2, // Raise slightly to sit on top of grass
        weight: 7,
    },
    {
        type: ObstacleType.PROTEIN_SHAKE,
        width: 30,
        height: 50,
        y: GAME_CONFIG.GROUND_Y - 50 - 80,
        weight: 10,
    },
];
