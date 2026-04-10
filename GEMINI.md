# 🌴 Canggu Jump: GEMINI Context

Canggu Jump is a high-energy, 8-bit rhythmic runner game set in the vibrant streets of Canggu, Bali. It uses AI-powered pose detection to track real-life player movement (jumping) to control an in-game legendary Canggu Bodybuilder.

## 🚀 Project Overview

- **Purpose**: A visually rich, interactive game prototype built for VibeJam 2026.
- **Core Mechanic**: AI Pose Detection via MediaPipe tracks the player's physical jumps to dodge island-themed obstacles.
- **Main Technologies**:
  - **Frontend**: React 19 + TypeScript + Vite.
  - **Vision**: MediaPipe Pose Landmarker for real-time body tracking.
  - **Audio**: Web Audio API for custom 8-bit sound synthesis (no external assets).
  - **Rendering**: HTML5 Canvas 2D API.
  - **Styling**: Tailwind CSS + Press Start 2P font for a retro aesthetic.

## 🛠 Building and Running

### Commands
- **Install Dependencies**: `npm install`
- **Start Development Server**: `npm run dev` (runs on [http://localhost:3000](http://localhost:3000))
- **Production Build**: `npm run build` (outputs to `/dist`)
- **Type Checking/Linting**: `npm run lint` (runs `tsc --noEmit`)
- **Preview Build**: `npm run preview`

### Deployment
The project is configured for GitHub Pages.
- **Base Path**: `/canggujump/` (configured in `vite.config.ts`)
- **CI/CD**: `.github/workflows/deploy.yml` automatically builds and deploys to GitHub Pages on every push to the `main` branch.

## 📁 Directory Structure & Key Files

- `components/DinoGame.tsx`: The heart of the application. Contains:
  - Game Engine (pooling, update loops, collision detection).
  - Vision Logic (MediaPipe integration, jump signal detection).
  - Audio Synthesis (`SoundSynth` object using Web Audio API).
  - Render Logic (Canvas painting for character, background, and obstacles).
- `App.tsx`: Main layout wrapper.
- `metadata.json`: Project metadata including description and required permissions (`camera`).
- `vite.config.ts`: Vite configuration with environment variable injection and path aliases.
- `public/`: Static assets and Open Graph images.

## 📝 Development Conventions

- **State Management**: Uses React's `useRef` for high-frequency game engine and vision state to avoid unnecessary re-renders, while using `useState` for UI-level status changes.
- **Optimization**:
  - **Entity Pooling**: Obstacles, scenery, and ground details are pooled to minimize garbage collection during gameplay.
  - **Vision Frequency**: AI detection is capped at 30 FPS (`VISION_FPS`) to preserve CPU resources for game rendering.
- **Styling**: Strictly adheres to a retro game aesthetic using the `Press Start 2P` font and a specific color palette defined in `GAME_CONFIG`.
- **Sound**: All game sounds are procedurally generated. Do not add external MP3/WAV files unless requested.
- **Permissions**: Requires camera access. Ensure `requestFramePermissions` in `metadata.json` is maintained.

## 🎮 Game Engine Details

- **Gravity/Jump**: Handled via physical simulation in the `update` loop.
- **Obstacles**: Includes Scooters (Single, Triple, Surfer), Bali Dogs, Canang Sari, Padel Balls, and Potholes.
- **Power-Ups**: Protein Shakes grant temporary immunity and size boosts.
- **Biomes**: Seamlessly transitions between `OCEAN` and `RICE_FIELD` backgrounds using a timer-based system.
