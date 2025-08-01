# Project Context: Online Browser MOBA Game

## Game Overview
*Describe your MOBA game concept here - what makes it unique, target audience, core gameplay mechanics*
This is an IO MOBA game - the idea is to boil down the core essence of a MOBA for quick and simple online matches that are still engaging and high-action! Matches will be about 5 minutes, it's single lane, and mouse only!

## Core Features
- [x] Real-time multiplayer gameplay
- [x] Browser-based (no downloads required)
- [x] Team-based combat
- [x] Basic combat system with respawning
- [ ] Map with lanes and objectives
- [ ] Item system
- [ ] Experience and leveling

## Technical Stack
*List your preferred technologies here*
- Frontend: Typescript/Phaser
- Backend: Node.js (with typescript, express, and colyseus)
- Database: dunno yet
- Real-time communication: probably sockets? 
- Hosting: ?? tbd

## Development Priorities
1. Phase 1: Core gameplay mechanics, locally hosted
2. Phase 2: Multiplayer - online hosting

## Current Status
**August 2nd, 2025** - Core multiplayer combat system implemented with:
- Real-time player movement and combat
- Team-based gameplay (Blue vs Red)
- Turret defensive structures
- Player respawning system with visual timer
- Dynamic respawn duration system (ready for leveling)
- Attack radius indicators and combat feedback

## Design Decisions
- **Server-authoritative**: All game logic runs on server, client only handles rendering
- **Colyseus for multiplayer**: Real-time state synchronization with automatic client updates
- **Phaser for game engine**: 2D game rendering with smooth animations and tweening
- **TypeScript throughout**: Type-safe development for both client and server
- **Config-driven design**: All game values centralized in config files for easy balancing
- **Dynamic respawn system**: Player-specific respawn durations ready for leveling features

## Notes & Ideas
- **Leveling system**: Players could gain experience from combat, reducing respawn times
- **Turret upgrades**: Defensive structures could be enhanced with resources
- **Team coordination**: Voice chat or ping system for team communication
- **Map objectives**: Capture points, neutral monsters, or lane pushing mechanics
- **Item system**: Equipment that affects combat stats and respawn times
- **Sound design**: Audio feedback for combat, respawning, and team events

---

## How to Use This File
- Update this file as you think of new features or make design decisions
- Add context about specific implementation challenges
- Document any external resources or inspiration
- Keep track of what we've built and what's next

Last updated: August 2nd, 2025 