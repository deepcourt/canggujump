# Canggu Jump: The VibeJam Podium Plan

This document outlines a detailed, atomic plan to elevate "Canggu Jump" into a polished, viral, and award-worthy game for VibeJam 2026. Each module is designed to be a self-contained unit of work.

---

### **Q&A: Your Strategic Questions Answered**

*   **Q: What about adding ASCII animation?**
    *   **A:** It's a cool idea, but it would clash with the game's current visual style. The game uses smooth vector graphics on an HTML5 canvas, while ASCII art is text-based and grid-aligned. Mixing them would be technically complex and visually inconsistent. It's best to maintain the clean, 8-bit vector aesthetic.

*   **Q: For the keyboard fallback, should we also use the up arrow to jump?**
    *   **A:** Absolutely. It's a standard convention for web-based platformers. We will implement both `Space` and `ArrowUp` for jumping.

*   **Q: The plan says "Twitter URL," but it's "X" now.**
    *   **A:** You're right. While the `twitter.com` domain still works for the share intent, we'll update the button text to be "Share on X" for clarity.

*   **Q: Should we review and improve all assets before putting them in the game?**
    *   **A:** Yes, that's an excellent workflow. The best way to do this is by building a simple "Scene Viewer" or "Storybook" page. This developer tool lets you view and tweak each asset (player, obstacles, etc.) in isolation, making it much faster to perfect their design before integrating them into the full game.

---

## **Module 0: Foundational Quick Wins**

*(Objective: Improve developer experience and player retention with low-effort, high-impact changes.)*

*   **Task 0.1: Implement Keyboard Fallback:** Add event listeners for the `Space` and `ArrowUp` keys to trigger the jump. This is crucial for accessibility and makes testing much faster.
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

*   **Task 2.1: Implement "Share on X" Button:** On the Game Over screen, add a button that opens a pre-filled X (formerly Twitter) intent URL with the player's score, a link to the game, and relevant hashtags (`#canggujump`, `#vibejam`).
*   **Task 2.2: Implement Personalized Game Over Messages:** On the Game Over screen, display a funny message based on the obstacle the player collided with. Implement this list:
    *   **Scooter/Triple Scooter:** "Learned about traffic the hard way."
    *   **Dog:** "Tried to pet the dog. It didn't go well."
    *   **Canang Sari:** "Disrespected the offerings. Bad karma."
    *   **Padel Ball:** "Should have worn a helmet. Padel is serious business."
    *   **Pothole:** "The road giveth, and the road taketh away."
    *   **Dog Poo:** "You've had a crappy day."
    *   **Bird:** "Got swooped."

## **Module 3: Content & Humor**

*(Objective: Increase gameplay variety and lean into the satirical theme.)*

*   **Task 3.1: Create the "Influencer" Obstacle:**
    *   Design a new obstacle character that runs, but periodically stops dead in its tracks for 1-2 seconds to "pose for a selfie," creating a timing challenge for the player.

## **Module 4: Audio Overhaul**

*(Objective: Fix performance issues and dramatically improve sound quality.)*

*   **Task 4.1: Fix Performance with Audio Pooling:** Modify the `SoundSynth` to pre-load and cache generated or loaded sounds into `AudioBuffer`s. Play sounds by creating a new `AudioBufferSourceNode` from the cached buffer, which will eliminate stuttering.
*   **Task 4.2: Generate New Sound Effects:**
    *   **Option A (Visual Tool):** Use a free, web-based tool like **[sfxr.me](https://sfxr.me/)** to generate and download `.wav` files.
    *   **Option B (Code-Based):** Use a micro-library like **[ZzFX](https://killedbyapixel.github.io/ZzFX/)**. It's a tiny JS synth that generates sounds from an array of parameters, which can be faster to integrate and tweak directly in code.
    *   **Sounds to Create:** `jump`, `player_hit`, `powerup_collect`, `button_click`.
*   **Task 4.3: Integrate New Sounds:** Add a loader to fetch `.wav` files (if using Option A) or integrate the ZzFX library (if using Option B). Store sounds in the `SoundSynth` cache to be played by the new audio system from Task 4.1.

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
