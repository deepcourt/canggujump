/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 300,
    GROUND_Y: 200,
    DINO_START_X: 60,
    DINO_GROUND_Y: 200,
    JUMP_FORCE: 700,
    GRAVITY: 2500,
    INITIAL_SPEED: 300,
    MAX_SPEED: 800,
    SPEED_INCREMENT: 5,
    VISION_FPS: 30,
    COLORS: {
        PRIMARY: '#535353',
        SKY: '#87CEEB', // Sky blue
        OCEAN: '#4682B4', // Steel blue
        SAND: '#DEB887', // Burly wood
        POTHOLE: '#333',
        DOG: '#8B4513', // Saddle brown
        CANANG: '#FFC0CB', // Pink
        PROTEIN: '#AFEEEE', // Pale turquoise
        PADEL: '#90EE90', // Light green
        BIRD: '#444',
        SCOOTER: '#FFEB3B', // Yellow
        HELMET: '#607D8B', // Blue Grey
        PINK_FLUO: '#FF00FF', // Magenta
        SKIN: '#FFDBAC', // Peach
        TANNED: '#e1ad8e', // Tanned skin tone
        ACCENT: '#FFC107', // Amber
        FOCUS: '#ff6b6b', // A vibrant pinkish-red
    }
};

export enum ObstacleType {
    SCOOTER = 'SCOOTER',
    TRIPLE_SCOOTER = 'TRIPLE_SCOOTER',
    DOG_POO = 'DOG_POO',
    POTHOLE = 'POTHOLE',
    BIRD = 'BIRD',
    DOG = 'DOG',
    CANANG_SARI = 'CANANG_SARI',
    PROTEIN_SHAKE = 'PROTEIN_SHAKE',
    PADEL_BALL = 'PADEL_BALL',
    INFLUENCER = 'INFLUENCER'
}

export const GAME_OVER_MESSAGES: Record<string, string> = {
    [ObstacleType.SCOOTER]: "Learned about traffic the hard way.",
    [ObstacleType.TRIPLE_SCOOTER]: "Learned about traffic the hard way.",
    [ObstacleType.DOG]: "Tried to pet the dog. It didn't go well.",
    [ObstacleType.CANANG_SARI]: "Disrespected the offerings. Bad karma.",
    [ObstacleType.PADEL_BALL]: "Should have worn a helmet. Padel is serious business.",
    [ObstacleType.POTHOLE]: "The road giveth, and the road taketh away.",
    [ObstacleType.DOG_POO]: "You've had a crappy day.",
    [ObstacleType.BIRD]: "Got swooped.",
    [ObstacleType.INFLUENCER]: "Ruined their perfect shot. Now everyone's mad.",
    [ObstacleType.PROTEIN_SHAKE]: "Wait... how did you die to a protein shake?", // Should not happen
};
