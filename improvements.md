# Canggu Jump: The VibeJam Podium Plan

This document outlines a detailed, atomic plan to elevate "Canggu Jump" into a polished, viral, and award-worthy game for VibeJam 2026. Each module is designed to be a self-contained unit of work.

---

### **Q&A: Your Strategic Questions Answered**

*   **Q: How can we make the sound better? The procedural audio isn't amazing.**
    *   **A:** You are right. While procedural audio is technically impressive, crafting great sound is an art. The best next step is to use a dedicated **8-bit sound effect generator**.
    *   **Recommendation:** Use a free, web-based tool like **[sfxr.me](https://sfxr.me/)**. It allows you to generate classic retro sounds (jump, explosion, power-up) with simple sliders and export them as high-quality `.wav` files. This gives you creative control without needing to be a sound engineer. We will then load these small `.wav` files instead of generating sounds on the fly.

*   **Q: What does a "level editor" mean?**
    *   **A:** A level editor is a **developer tool**, not a feature for players. Imagine a separate page in your app where you can visually drag and drop obstacles onto the game path, change their speed with a slider, and hit "play" to test that specific sequence instantly. It saves you from having to play the game from the start just to debug one specific obstacle interaction. For a jam, this is an advanced tool, but it's how professionals build and test levels efficiently.

*   **Q: Would real images or SVGs look good in the game?**
    *   **A:** Real images (photos) would clash with the game's clean, 8-bit aesthetic and are not recommended. **SVGs, however, are a perfect fit.** They are vector graphics, meaning they are clean, scalable, and would integrate beautifully with your existing art style. You could draw more complex shapes in a tool like Figma or Inkscape and export them as SVGs to use in the game.

*   **Q: The "Digital Nomad" obstacle doesn't resonate.**
    *   **A:** Understood. We will replace it with a more active and humorous obstacle: **The "Influencer,"** who suddenly stops to pose for a selfie, creating a dynamic and unpredictable hazard.

---

## **Module 0: Foundational Quick Wins**

*(Objective: Improve developer experience and player retention with low-effort, high-impact changes.)*

*   **Task 0.1: Implement Keyboard Fallback:** Add an event listener for the `Space` key to trigger the jump. This is crucial for accessibility and makes testing much faster.
*   **Task 0.2: Implement High Score Persistence:** Use the browser's `localStorage` to save and load the `highScore`. This makes players feel their progress is valued when they return to the game.

## **Module 1: Core Game Feel ("Juiciness")**

*(Objective: Make the game feel more alive and responsive. Polish the core interactions.)*

*   **Task 1.1: Add Screen Shake:** Implement a function that subtly shakes the game canvas for a fraction of a second when the player gets hit. This makes collisions feel more impactful.
*   **Task 1.2: Add Particle Effects:**
    *   Create a simple particle system using an object pool.
    *   Emit dust cloud particles when the player lands after a jump.
    *   Emit sparkling particles when the player collects a Protein Shake.
*   **Task 1.3: Implement Player "Squash and Stretch":** Animate the player character's dimensions to add life.
    *   Briefly "squash" (make wider and shorter) the player sprite upon landing.
    *   Briefly "stretch" (make taller and thinner) the player sprite at the peak of a jump.

## **Module 2: Virality & Engagement**

*(Objective: Add features that encourage players to share the game and compete.)*

*   **Task 2.1: Implement "Share Your Score" Button:** On the Game Over screen, add a button that opens a pre-filled Twitter intent URL with the player's score, a link to the game, and relevant hashtags (`#canggujump`, `#vibejam`).
*   **Task 2.2: Implement Personalized Game Over Messages:** On the Game Over screen, display a funny message based on the obstacle the player collided with (e.g., "Wiped out by a Padel Ball," "Should have respected the Canang Sari.").

## **Module 3: Content & Humor**

*(Objective: Increase gameplay variety and lean into the satirical theme.)*

*   **Task 3.1: Create the "Influencer" Obstacle:**
    *   Design a new obstacle character that runs, but periodically stops dead in its tracks for 1-2 seconds to "pose for a selfie," creating a timing challenge for the player.
*   **Task 3.2: Create the "Coconut Water" Power-Up:**
    *   Design a new collectible item.
    *   When collected, it grants a temporary **2x score multiplier** instead of invincibility, adding a risk/reward element to the gameplay.

## **Module 4: Audio Overhaul**

*(Objective: Fix performance issues and dramatically improve sound quality.)*

*   **Task 4.1: Fix Performance with Audio Pooling:** Modify the `SoundSynth` to pre-load and cache generated or loaded sounds into `AudioBuffer`s. Play sounds by creating a new `AudioBufferSourceNode` from the cached buffer, which will eliminate stuttering.
*   **Task 4.2: Generate New Sound Effects:** Use a web tool like **[sfxr.me](https://sfxr.me/)** to create and download `.wav` files for:
    *   A better `jump` sound.
    *   A `player_hit` sound.
    *   A `powerup_collect` sound.
    *   A `button_click` sound for the UI.
*   **Task 4.3: Integrate New `.wav` Sounds:** Add a loader to fetch the `.wav` files, decode them into `AudioBuffer`s, and store them in the `SoundSynth` cache to be played by the new audio system from Task 4.1.

## **Module 5: Advanced Architecture (Preparation for Growth)**

*(Objective: Refactor the codebase to make it scalable and easier to manage.)*

*   **Task 5.1: Decouple `DinoGame.tsx`:** Break the single large component into a more organized structure. This is a critical step for future development.
    *   Create `src/game/config.ts` for all game constants.
    *   Create `src/game/engine.ts` to hold the main game loop, state management, and core logic.
    *   Create `src/game/entities/` directory for classes like `Player.ts`, `Obstacle.ts`, etc.
    *   Create `src/game/audio.ts` for the `SoundSynth` object.
    *   The React component `DinoGame.tsx` will then become much smaller, primarily responsible for initializing the engine and rendering the UI.
*   **Task 5.2: Implement Data-Driven Obstacles:** Create a configuration file (e.g., `src/game/obstacles.config.ts`) that exports an array of obstacle definitions. Each definition will be an object containing properties like `type`, `width`, `height`, and `frequency`. The game engine will read from this config to spawn obstacles, making it trivial to add or balance them in the future.

## **Module 6: The Podium-Winning Feature (Stretch Goal)**

*(Objective: Implement a high-impact feature that fosters community and competition.)*

*   **Task 6.1: Implement Public Leaderboard:**
    *   **Backend:** Create a serverless function (using the free tier of Vercel, Netlify, or GitHub Actions) that can write a score to a public GitHub Gist. This function will be protected by a secret to prevent cheating.
    *   **Frontend:**
        *   On game over, send the player's score to the serverless function.
        *   On the start screen, fetch and display the top 5 scores directly from the public Gist's raw URL.
