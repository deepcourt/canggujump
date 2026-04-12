/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GAME_CONFIG, ObstacleType } from './config';
import type { ObstacleConfig } from './obstacles.config';

export const DIFFICULTY_THRESHOLDS = {
    PHASE_2: 300,
    PHASE_3: 800,
};

// All obstacle definitions now live here, organized by the phase they are introduced in.
export const OBSTACLES_BY_PHASE: { [key: number]: ObstacleConfig[] } = {
    1: [
        { type: ObstacleType.DOG_POO, width: 25, height: 12, y: GAME_CONFIG.GROUND_Y - 12, weight: 15 },
        { type: ObstacleType.CANANG_SARI, width: 30, height: 15, y: GAME_CONFIG.GROUND_Y - 15, weight: 13 },
        {
            type: ObstacleType.POTHOLE, width: 40, height: 10, y: GAME_CONFIG.GROUND_Y, weight: 14,
            customSpawn: (obs) => {
                obs.width = Math.random() > 0.6 ? 80 : 40;
                obs.potholeDebris = [];
                const numDebris = 5 + Math.floor(Math.random() * 5);
                for (let i = 0; i < numDebris; i++) {
                    obs.potholeDebris.push({
                        angle: Math.random() * Math.PI * 2,
                        distance: (obs.width / 2) * (0.9 + Math.random() * 0.2),
                        size: 2 + Math.random() * 3,
                        color: `rgb(100,100,100, ${0.5 + Math.random() * 0.5})`
                    });
                }
            }
        },
    ],
    2: [
        { type: ObstacleType.DOG, width: 55, height: 35, y: GAME_CONFIG.GROUND_Y - 35, weight: 10, speedMultiplier: 1.4 },
        {
            type: ObstacleType.SCOOTER, width: 70, height: 55, y: GAME_CONFIG.GROUND_Y - 55 - 2, weight: 10,
            customSpawn: (obs) => {
                obs.hasSurfboard = Math.random() > 0.5;
                if (obs.hasSurfboard) {
                    const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1'];
                    obs.helmetColor = colors[Math.floor(Math.random() * colors.length)];
                } else {
                    obs.helmetColor = '#22c55e';
                }
            }
        },
        {
            type: ObstacleType.BIRD, width: 30, height: 20, y: 50, weight: 6, speedMultiplier: 1.2,
            customSpawn: (obs) => { obs.y = 50 + Math.random() * 30; }
        },
        { type: ObstacleType.PROTEIN_SHAKE, width: 30, height: 50, y: GAME_CONFIG.GROUND_Y - 50 - 80, weight: 10 },
    ],
    3: [
        {
            type: ObstacleType.TRIPLE_SCOOTER, width: 85, height: 55, y: GAME_CONFIG.GROUND_Y - 55 - 2, weight: 9,
            customSpawn: (obs) => {
                const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1'];
                obs.helmetColor = colors[Math.floor(Math.random() * colors.length)];
            }
        },
        {
            type: ObstacleType.PADEL_BALL, width: 25, height: 25, y: GAME_CONFIG.GROUND_Y - 25, weight: 5, speedMultiplier: 1.1,
            customSpawn: (obs) => {
                if (Math.random() > 0.6) {
                    obs.padelIsBouncing = true;
                    obs.y = 100;
                    obs.padelVY = -150;
                }
            }
        },
        { type: ObstacleType.INFLUENCER, width: 40, height: 65, y: GAME_CONFIG.GROUND_Y - 65 - 2, weight: 7 },
    ]
};
