---
last_updated: 2026-05-23T12:29:10Z
---

# Architecture Design

## System Overview
A single-page React application with a canvas-based game engine. The game runs entirely client-side with no backend needed. The main game loop handles rendering, physics, collision detection, and state management through React state and refs.

## Tech Stack
- React 18 + TypeScript
- HTML5 Canvas for game rendering
- Tailwind CSS for UI overlays
- Vite for bundling

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| Game Engine | Core game loop, canvas rendering, state management | src/game/GameEngine.ts |
| Player | Orochimaru character, attacks, movement | src/game/Player.ts |
| Enemies | Enemy types, spawning, AI behavior | src/game/Enemy.ts |
| Game Types | Shared interfaces and constants | src/game/types.ts |
| Game Page | React component wrapping canvas + HUD | src/pages/Index.tsx |

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|

## File Tree Plan
```
src/
├── pages/
│   └── Index.tsx          # Main game page with all screens
├── game/
│   ├── types.ts           # Game interfaces, constants, enums
│   ├── GameEngine.ts      # Core game loop, rendering, collision
│   ├── Player.ts          # Orochimaru player logic
│   └── Enemy.ts           # Enemy spawning and behavior
├── App.tsx                # Router
├── main.tsx               # Entry point
└── index.css              # Global styles
```

## Implementation Guide

