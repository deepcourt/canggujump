# Game Development Strategy & Guidance

This document answers key strategic questions about developing "Canggu Jump", focusing on best practices for a solo developer aiming for a high-quality jam game.

---

### 1. What is the right development sequence? (Solo Dev vs. Team)

For a solo developer, the best approach is a "vertical slice." Instead of building all systems at once, pick one core feature and build it out completely—gameplay, art, sound, and polish. This gives you a sense of accomplishment and a testable piece of the final experience.

**Recommended Sequence for this Jam:**

1.  **High-Impact Virality:** Implement the **"Share Your Score" button**. It's low effort, high reward, and critical for a jam.
2.  **Game Feel ("Juiciness"):** Add **Screen Shake** and **Particle Effects**. This will make the existing game feel 10x better and more polished with minimal code.
3.  **Content Variety:** Introduce **one new, funny obstacle** (e.g., the "Digital Nomad"). This adds to the humor and replayability.
4.  **Core Systems:** Now, tackle a bigger system like the **Leaderboard** or **Refactoring** the code for new worlds.

A large team would work in parallel: one person on sound, another on art, another on the leaderboard backend. As a solo dev, you must be the "project manager" and choose the sequence that delivers the most value for your time.

---

### 2. How to handle sound (licensing and performance)?

*   **Licensing (iMovie Sounds):** **Do not use them.** Apple's software license agreement is restrictive. You generally cannot use their bundled sound effects for commercial purposes or outside of a video produced with their software. **Best Practice:** Use sounds with a clear, permissive license (like CC0) from sites like `freesound.org`, or continue with your procedural audio.
*   **Performance:** The stuttering is almost certainly because you're creating new `AudioContext` nodes for every sound. This is very inefficient.
    *   **Best Practice (The "Pool" method):** For short, repeated sounds (like jump, step), create the sound buffer **once** when the game loads. When you need to play the sound, create a new `AudioBufferSourceNode`, point it to the existing buffer, and play it. This is much faster than re-synthesizing the sound every time. Your `createNoiseBuffer` is a good start; apply that logic to other sounds.

---

### 3. How to automate concepts for new worlds (e.g., Tokyo)?

You're on the right track. You don't automate the *ideation*, you automate the *construction* from your ideas. This is called **data-driven design**.

1.  **Research:** Go to Reddit, Nomad List, etc., and make a list of iconic, humorous stereotypes for Tokyo (e.g., "Vending Machines," "Shibuya Scramble," "Salaryman," "Anime Fan," "Godzilla").
2.  **Create Assets:** Draw the art and write the specific behavior code for each of these new entities.
3.  **Create a Config File:** This is where the refactoring pays off. You'd create a `worlds/tokyo.ts` file that exports a configuration object, like:
    ```typescript
    export const tokyoWorld = {
      background: 'cityscape',
      obstacles: [
        { type: 'VendingMachine', frequency: 0.3 },
        { type: 'Salaryman', frequency: 0.5 },
      ],
      // ...etc
    };
    ```
4.  **Load the Config:** The main game engine would simply load this configuration to know what to draw and spawn. This makes adding new cities a matter of creating a new config file, not rewriting the engine.

---

### 4. When is the right time to refactor?

**Now.** The best time to refactor is *before* you add a lot of new, similar content.

You are about to add more obstacles, more power-ups, and potentially more worlds. If you do this in the current `DinoGame.tsx` file, it will become a tangled mess and bugs will be much harder to fix.

Refactoring now into separate files (`Player.ts`, `Obstacle.ts`, `engine.ts`) will feel like a slowdown for a day, but it will make you go **much faster** when you start adding all the cool new features.

---

### 5. How to debug rare events (1-in-50 obstacle)?

Create a **debug mode**. This is a standard practice in game development.

*   **Implementation:** Add a key listener. For example, if you press the "9" key, you can have a debug flag that forces the next obstacle to be the rare one.
    ```typescript
    // In spawnObstacle logic
    if (debug_forceRareObstacle) {
      type = RARE_OBSTACLE_TYPE;
      debug_forceRareObstacle = false; // Reset the flag
    } else {
      // Normal random logic
    }
    ```
This allows you to test rare behaviors on demand without playing for hours.

---

### 6. How does the "Share Your Score" button work?

It's incredibly simple and requires **no login**. It's just a specially formatted HTML link.

```html
<a href="https://twitter.com/intent/tweet?text=I+scored+500+in+CANGGU+JUMP!&url=https://your-game.com&hashtags=vibejam,gamedev" target="_blank">
  Share on Twitter
</a>
```

When the user clicks it, it opens a new Twitter tab with the text, URL, and hashtags already filled in. The user just has to click "Post." It's a powerful, zero-friction marketing tool.

---

### 7. How to do a leaderboard without a database?

Yes, you can absolutely do this without a full database or a Python backend.

*   **The Gist Method:** Use the GitHub Gist API. A Gist is just a file hosted on GitHub.
    1.  Create a public Gist containing a JSON file, e.g., `leaderboard.json`.
    2.  **To Read Scores:** Your game client can directly fetch the raw URL of this public Gist. It's just a simple `fetch()` request.
    3.  **To Write Scores:** This is the tricky part. You can't let clients write directly, as that's insecure. Instead, you can use a **serverless function** (e.g., on Vercel, Netlify, or even GitHub Actions). The game sends the new score to the serverless function, which then uses a secret token to authenticate with the GitHub API and update the Gist.

This approach is free, leverages the JavaScript/TypeScript ecosystem you're already in, and is perfect for a jam game.

---

### 8. How to improve art and debug it efficiently?

*   **Improving Art:** The art style is consistent, which is good. To make it "pop," focus on **"juiciness"**:
    *   **Squash and Stretch:** When the player lands, make them shorter and wider for a few frames. When they jump, stretch them vertically. This simple animation principle adds a huge amount of life.
    *   **Particles:** Add dust clouds on landing, sparkles on power-ups.
*   **Debugging Art (A "Storybook"):** Don't rely on running the game. Create a **scene viewer**. This is a separate page or mode in your app where you can render any single game entity in isolation. You can have UI sliders to change its properties (e.g., `scale`, `color`, `animationState`) and see the visual changes instantly. This is a massive time-saver for artists and developers.

---

### 9. What else is missing?

1.  **Onboarding/Tutorial:** Your idea for a practice mode is excellent. Before the first real game, run a slow-speed version with text overlays: "JUMP to dodge this!" This teaches the core mechanic without a boring wall of text.
2.  **State Persistence:** Use `localStorage` in the browser to save the `highScore` and `playerName`. It's a one-line change that makes players feel like their progress matters when they return.
3.  **Accessibility:** Add a **keyboard fallback** (e.g., Spacebar to jump). This is crucial for players who can't use a camera, and it also makes it much easier for *you* to test the game quickly without having to jump around.
