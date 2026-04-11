# Refactoring Plan: Canggu Jump

This document provides a precise, phased plan for refactoring the `DinoGame.tsx` component. The goal is to create a scalable and maintainable architecture for future development.

**Methodology:**
Execute **one phase at a time**. After completing the code changes for a single phase, you **must stop and thoroughly test the game**. Verify that it functions exactly as it did before. This incremental approach prevents bugs and ensures the refactor is successful.

---

### **Phase 1: Decouple the Audio System**

*(Goal: Move all audio-related code into its own dedicated file.)*

1.  **Create a new file:** `src/game/audio.ts`.
2.  **Move Code:**
    *   Cut the `ExtendedWindow` interface from `DinoGame.tsx`.
    *   Cut the entire `SoundSynth` object from `DinoGame.tsx`.
    *   Paste both into the new `src/game/audio.ts` file.
3.  **Export:** Add the `export` keyword before the `const SoundSynth` declaration.
4.  **Update Imports:** In `DinoGame.tsx`, add a new import at the top:
    `import { SoundSynth } from '../game/audio';`

**➡️ STOP & TEST:** Play the game. Verify that all sounds work correctly: player steps, jumps, getting hit, collecting a power-up, button clicks, and the immunity music.

---

### **Phase 2: Decouple Game Entities (Player & Particles)**

*(Goal: Isolate the player and particle logic from the main component.)*

1.  **Create new files:**
    *   `src/game/entities/Player.ts`
    *   `src/game/entities/Particle.ts`
2.  **Move Player Code:**
    *   Cut the `PlayerEntity` interface and the `createBodyBuilder` function from `DinoGame.tsx`.
    *   Paste them into `src/game/entities/Player.ts`.
    *   In `Player.ts`, import `GAME_CONFIG` and `SoundSynth`.
    *   Add the `export` keyword to both the `PlayerEntity` interface and the `createBodyBuilder` function.
3.  **Move Particle Code:**
    *   Cut the `Particle` class from `DinoGame.tsx`.
    *   Paste it into `src/game/entities/Particle.ts`.
    *   Add the `export` keyword before the class declaration.
4.  **Update Imports:** In `DinoGame.tsx`:
    *   Import the player: `import { createBodyBuilder, PlayerEntity } from '../game/entities/Player';`
    *   Import the particles: `import { Particle } from '../game/entities/Particle';`

**➡️ STOP & TEST:** Play the game. Focus on the player. Verify that the character model, animations, jumping, collisions, power-ups, and particle effects (on landing and power-up collection) all work exactly as before.

---

### **Phase 3: Decouple Remaining Entities**

*(Goal: Move all remaining game objects into their own files.)*

1.  **Create new files:**
    *   `src/game/entities/Ground.ts`
    *   `src/game/entities/Obstacle.ts`
    *   `src/game/entities/Scenery.ts`
2.  **Move GroundDetail Code:**
    *   Cut the `GroundDetail` class from `DinoGame.tsx` and paste it into `src/game/entities/Ground.ts`.
    *   In `Ground.ts`, import `GAME_CONFIG`.
    *   Export the class.
3.  **Move Obstacle Code:**
    *   Cut the `Obstacle` class from `DinoGame.tsx` and paste it into `src/game/entities/Obstacle.ts`.
    *   In `Obstacle.ts`, import `GAME_CONFIG`, `ObstacleType`, and `SoundSynth`.
    *   Export the class.
4.  **Move SceneryElement Code:**
    *   Cut the `SceneryElement` class from `DinoGame.tsx` and paste it into `src/game/entities/Scenery.ts`.
    *   In `Scenery.ts`, import `GAME_CONFIG`.
    *   Export the class.
5.  **Update Imports:** In `DinoGame.tsx`, add new imports for these entities.

**➡️ STOP & TEST:** Play the game. Verify that all obstacles (scooters, dogs, etc.), background scenery (trees, surfers), and ground details appear and behave correctly.

---

### **Phase 4: Decouple the Core Game Engine**

*(Goal: Move the main game loop and all state management out of the React component.)*

1.  **Create a new file:** `src/game/engine.ts`.
2.  **Move Core Logic:**
    *   Move the `GameEngineState` interface into `engine.ts`.
    *   Move the helper function `getFromPool` into `engine.ts`.
    *   Move the core game loop functions (`runGameLoop`, `spawnObstacle`, `spawnGroundDetails`, `spawnScenery`, `gameOver`, `resetGame`) from `DinoGame.tsx` into `engine.ts`.
3.  **Create the Engine Object:**
    *   Inside `engine.ts`, create a main function `createGameEngine(callbacks)`. This function will manage the game state and expose methods like `start()`, `stop()`, and `handleJumpSignal()`.
    *   The `DinoGame.tsx` component's `engineRef` will be removed.
4.  **Simplify the React Component:**
    *   The `DinoGame.tsx` component will become much smaller. It will now be responsible only for:
        *   Rendering the UI (canvas, buttons, overlays).
        *   Initializing the game engine in a `useEffect` hook.
        *   Passing callbacks to the engine to update the React state (e.g., `onScoreUpdate`, `onGameOver`).
        *   Connecting user input (keyboard, clicks) to the engine's public methods.

**➡️ STOP & TEST:** This is the most significant change. Test all aspects of the game one more time. The game should be fully playable and behave identically to the user, even though its internal structure is now completely refactored.
