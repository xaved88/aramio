# Aramio MOBA

A real-time multiplayer browser-based MOBA game built with Phaser and Colyseus.

## 🎮 Features

- **Real-time multiplayer** - Play with friends in real-time
- **Browser-based** - No downloads required, play instantly
- **Team-based combat** - Blue vs Red teams
- **Real-time synchronization** - Smooth player movement and state sync
- **TypeScript** - Type-safe development

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aramio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

This will start:
- **Client**: http://localhost:3000 (Phaser game)
- **Server**: http://localhost:2567 (Colyseus server)
- **Monitor**: http://localhost:2567/colyseus (Colyseus monitor)

## 📁 Project Structure

```
aramio/
├── src/
│   ├── client/              # Phaser game client
│   │   ├── main.ts         # Game initialization
│   │   ├── scenes/         # Game scenes
│   │   ├── entity/         # Entity rendering and management
│   │   └── ui/             # HUD and UI components
│   ├── server/             # Colyseus server
│   │   ├── index.ts        # Server setup
│   │   ├── rooms/          # Game rooms
│   │   ├── schema/         # Game state definitions
│   │   ├── game/           # Game logic and systems
│   │   │   ├── stateMachine/  # Game state management
│   │   │   ├── combatants/    # Player, bot, and minion logic
│   │   │   └── utils/         # Utility functions
│   │   └── shared/         # Shared types and utilities
│   ├── shared/             # Shared code between client and server
│   │   ├── types/          # TypeScript interfaces
│   │   └── utils/          # Shared utilities
│   └── Config.ts           # Centralized game configuration
├── index.html              # Main HTML file
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
└── PROJECT_CONTEXT.md      # Project context and notes
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run dev:client` - Start only the client (Vite dev server)
- `npm run dev:server` - Start only the server (Colyseus)
- `npm run build` - Build for production
- `npm run build:server` - Build server only
- `npm start` - Start production server
- `npm test` - Run unit tests

### Testing Production Build Locally

To test the production build (including static assets) locally:

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm start
   ```

3. **Access the game:**
   - Game: http://localhost:2567
   - Monitor: http://localhost:2567/colyseus

This serves the built client from `dist/client/` and is useful for testing asset loading and production behavior.

### Tech Stack

- **Frontend**: Phaser 3.70 (Game engine)
- **Backend**: Colyseus 0.15 (Multiplayer framework)
- **Language**: TypeScript
- **Build Tool**: Vite
- **Server**: Express + WebSocket
- **Testing**: Jest

### Game Architecture

- **GameScene**: Main Phaser scene handling game rendering
- **GameRoom**: Colyseus room managing multiplayer state
- **GameState**: Schema defining synchronized game data
- **EntityManager**: Manages client-side entities and visual effects
- **EntityRenderer**: Handles rendering of game entities
- **HUDRenderer**: Displays player stats and UI
- **CollisionUtils**: Handles collision detection and resolution

## 🎯 Current Features

- ✅ Real-time multiplayer connection
- ✅ Player movement synchronization
- ✅ Team assignment (Blue/Red)
- ✅ Basic health system
- ✅ Game state management
- ✅ Hot reloading development
- ✅ Turret system (defensive structures)
- ✅ Player respawning system with visual timer
- ✅ Combat system with attack radius indicators
- ✅ Experience and leveling system
- ✅ Minion spawning and AI
- ✅ Collision detection and resolution
- ✅ Visual feedback for XP gains and level-ups
- ✅ Centralized configuration management
- ✅ Projectile system with team-based colors
- ✅ Bot spawning and management
- ✅ Unit testing with Jest



## 🔧 Configuration

### Environment Variables

- `PORT` - Server port (default: 2567)

### Development Ports

- Client: 3000
- Server: 2567
- Colyseus Monitor: 2567/colyseus

## 🧪 Testing

The project includes a comprehensive test suite:

```bash
npm test                    # Run all tests
npm test -- --watch        # Run tests in watch mode
npm test -- --coverage     # Run tests with coverage report
```

### Test Structure
- **Unit Tests**: Test individual game logic functions
- **Integration Tests**: Test game state interactions
- **Configuration Tests**: Ensure config values are properly applied

## 📝 Contributing

1. Update `PROJECT_CONTEXT.md` with your changes
2. Follow TypeScript best practices
3. Test multiplayer functionality
4. Add tests for new features
5. Update documentation as needed

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill process on port 2567
npx kill-port 2567
# Kill process on port 3000
npx kill-port 3000
```

**TypeScript errors:**
```bash
npm run build:server
```

**Client not connecting:**
- Check server is running on port 2567
- Verify WebSocket connection in browser dev tools
- Check Colyseus monitor at http://localhost:2567/colyseus

## 📚 Resources

- [Phaser Documentation](https://phaser.io/docs)
- [Colyseus Documentation](https://docs.colyseus.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

---

**Last updated**: August 4th, 2025 
