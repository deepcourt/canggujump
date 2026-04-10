# Game Improvement Ideas (v1)

Based on the project's goal of being a high-energy jam game hosted on GitHub Pages, here are some suggestions for improvements.

---

### 1. Add a Public Leaderboard

*   **What:** Display a list of the top 5 or 10 high scores on the start screen or game over screen. Since the game is hosted on GitHub Pages and requires no authentication, you could use a simple, free backend service (like a public GitHub Gist, Supabase, or a similar free-tier database) to store and retrieve scores.
*   **Why:** This is a classic feature for arcade-style games that dramatically increases replayability. Players will be motivated to compete for the top spot, and it fosters a sense of community around the game, which is great for a jam project.

### 2. Introduce More Thematic Obstacles and Power-ups

*   **What:** Add more characters and items that are iconic to the Canggu vibe.
    *   **"Digital Nomad" Obstacle:** A slow-moving character walking while staring at a laptop, creating a wide, unpredictable obstacle.
    *   **"Influencer" Obstacle:** A character that stops suddenly to pose for a selfie, forcing a quick reaction from the player.
    *   **"Coconut Water" Power-up:** A new collectible that could offer a temporary score multiplier instead of invincibility, adding a risk/reward element.
*   **Why:** These additions would lean further into the game's satirical theme, making the world feel more alive and chaotic. It increases gameplay variety and humor.

### 3. Implement a "Share Your Score" Feature

*   **What:** On the "Game Over" screen, add a "Share" button. When clicked, it could open a new Twitter tab with a pre-filled message like: `I scored [SCORE] in 🌴 CANGGU JUMP! Can you survive the chaos? #vibejam #gamedev [link-to-your-game]`.
*   **Why:** This is a powerful, low-effort way to encourage viral marketing. It makes it easy for players to boast about their scores and challenge friends, which can significantly increase the game's visibility, especially within the context of a game jam judged by a public figure like Pieter Levels.

### 4. Add a Dynamic Day/Night Cycle

*   **What:** Instead of just switching between biomes, make the background visuals transition through a full day cycle (e.g., sunrise -> day -> sunset -> night). This would involve changing the sky color, adding a moon, and adjusting the lighting on the scenery over time.
*   **Why:** This would add significant visual appeal and a sense of progression during a single run, making longer play sessions more rewarding. It enhances the "vibe" of the game without changing the core mechanics.
