# Project Context: Online Browser MOBA Game

## Game Overview
*Describe your MOBA game concept here - what makes it unique, target audience, core gameplay mechanics*
This is an IO MOBA game - the idea is to boil down the core essence of a MOBA for quick and simple online matches that are still engaging and high-action! Matches will be about 5 minutes, it's single lane, and mouse only!


## Technical Stack
*List your preferred technologies here*
- Frontend: Typescript/Phaser
- Backend: Node.js (with typescript, express, and colyseus)
- Database: dunno yet
- Real-time communication: probably sockets? 
- Hosting: ?? tbd

## Configuration Files
The project uses three separate configuration files to maintain proper separation of concerns:
- **GameConfig.ts**: Core gameplay mechanics, combat stats, abilities, experience system, minion spawning, etc.
- **ServerConfig.ts**: Server-specific settings like port, update rates, room management, team assignment
- **ClientConfig.ts**: Client-specific settings like UI rendering, animations, colors, HUD layout, debug options

### Configuration Architecture (Dependency Injection Pattern)
The project now uses a **dependency injection pattern** for gameplay configuration to enable:
- **Dynamic config loading** for different game settings
- **Testing with different configurations** without code changes
- **Multi-room scenarios** with different game rules
- **Clean separation** between server and client configs

**Key Components:**
- **ConfigProvider**: Server-side class that manages and loads different gameplay configurations
- **GameplayConfig Type**: Type alias (currently `any`, will be made strict later) for type safety
- **Room State Serialization**: Gameplay config is serialized and sent to clients via Colyseus room state

**Critical Import Rules:**
- **❌ NEVER import GameConfig.ts directly** in server code (except tests)
- **❌ NEVER import GameConfig.ts directly** in client code
- **✅ Use ConfigProvider.getConfig()** in server code
- **✅ Use injected GameplayConfig** in client code (received from server)
- **✅ Import TestGameplayConfig** in test files only

## Development Priorities
1. Phase 1: Core gameplay mechanics, locally hosted
2. Phase 2: Multiplayer - online hosting

## Design Decisions
- **Server-authoritative**: All game logic runs on server, client only handles rendering
- **Colyseus for multiplayer**: Real-time state synchronization with automatic client updates
- **Phaser for game engine**: 2D game rendering with smooth animations and tweening
- **TypeScript throughout**: Type-safe development for both client and server
- **Config-driven design**: All game values centralized in config files for easy balancing
- **Dynamic respawn system**: Player-specific respawn durations ready for leveling features
- **Dependency Injection**: Gameplay config injected through constructors, not static imports
- **Component-based Architecture**: Client-side components with single responsibilities
- **Loading State Pattern**: Clear separation between loading and game phases

## Client-Side Architecture
The client uses a **component-based architecture** to reduce the "god object" problem and improve maintainability:

**Core Components:**
- **LoadingScreen**: Manages initial loading state with "Loading..." message
- **ConnectionManager**: Handles server connection and room joining logic
- **DebugOverlay**: Manages coordinate grids, debug panels, and debug visualization
- **InputHandler**: Handles all input schemes and control logic
- **UIManager**: Manages HUD, victory screen, and UI elements
- **HUDRenderer**: Renders HUD elements with gameplay config injection
- **PathRenderer**: Renders path highlights with gameplay config injection

**Initialization Flow:**
1. **Loading Phase**: Show "Loading..." message, connect to server
2. **Config Phase**: Receive gameplay config from server, deserialize
3. **Game Phase**: Initialize all components with config, hide loading screen
4. **UI Phase**: Initialize UI components, start game rendering

**Benefits:**
- **Prevents hidden dependencies**: Impossible to accidentally add config-dependent code in wrong place
- **Modular design**: Each component can be tested and modified independently
- **Clear separation**: Loading vs. Game vs. UI phases are distinct
- **Easy maintenance**: Adding features won't break existing initialization flow

## Notes & Ideas
- **Leveling system**: Players could gain experience from combat, reducing respawn times
- **Turret upgrades**: Defensive structures could be enhanced with resources
- **Team coordination**: Voice chat or ping system for team communication
- **Map objectives**: Capture points, neutral monsters, or lane pushing mechanics
- **Item system**: Equipment that affects combat stats and respawn times
- **Sound design**: Audio feedback for combat, respawning, and team events

---

## Development Workflow
During feature creation, do not create new tests or check tests often - we want fast feedback with the prompter. Only when we're done with the feature should we be actively checking these things - then do the following:
- **Testing**: Run tests with `npm test` to verify functionality before committing
- **TypeScript Checking**: Run `npx tsc` to check for TypeScript errors before committing
- **Code Quality**: Fix any TypeScript errors or test failures before pushing changes
- **Config Import Check**: Verify no direct imports of GameConfig.ts in server/client code (except tests)
- **Dependency Injection**: Ensure all gameplay config access uses injected dependencies, not static imports

## Other Best Practices and Tips
- Always extract configurable values to the Config.ts file so they can be adjusted without live code changes.
- Remember that this is a game and 0,0 are coordinates in the upper left corner of the screen (so increasing y makes things lower on the screen).
- **State Conversion**: When adding new fields to server schemas (Colyseus), always update the `convertToSharedCombatant` function in `src/shared/utils/StateConverter.ts` to ensure proper client synchronization. Missing this step causes "Cannot read properties of undefined" errors.
- **Schema Synchronization**: New fields added to server-side schemas must be:
  1. Added to the server schema class (e.g., `Hero` in `Combatants.ts`)
  2. Added to the shared types interface (e.g., `HeroCombatant` in `CombatantTypes.ts`)
  3. Added to the state converter function (`StateConverter.ts`)
  4. Initialized in spawn/creation functions
- **Array Schema Fields**: When using Colyseus `ArraySchema` fields, use `Array.from(schemaField)` in the state converter to convert to regular arrays for the client.
- **Type Safety**: Always run `npx tsc --noEmit` after adding new fields to catch type mismatches between server and client.
- **Component Architecture**: When adding new client-side features, consider if they should be extracted into separate components rather than adding to GameScene
- **Loading State**: Any gameplay config-dependent code must be in `initializeGame()` or later, never in `create()`
- **Async Initialization**: Use proper async/await patterns for game initialization to prevent race conditions
- **Camera Safety**: Always check `this.scene.cameras.main` exists before accessing camera properties

## How to Use This File
- Update this file as you think of new features or make design decisions
- Add context about specific implementation challenges
- Document any external resources or inspiration
- Keep track of what we've built and what's next
