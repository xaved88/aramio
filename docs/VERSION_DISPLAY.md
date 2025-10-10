# Version Display System

## Overview
The game automatically displays the current git commit hash (first 6 characters) and commit message in the bottom right corner of the **lobby screen only**.

**Display format:** `Game Version: [hash] - [commit message]`

Example: `Game Version: 10adda - Bugfix: Mercenary would stand still sometimes during rage`

## How It Works

### Build-Time Generation
- **Script**: `scripts/generate-version.js`
- **Command**: `npm run gen`
- Runs automatically before `dev` and `build` commands via npm pre-hooks (`predev` and `prebuild`)
- Also runs in CI/CD pipeline before TypeScript type checking
- Generates `src/generated/version.ts` with:
  - Commit hash (first 6 characters)
  - Commit message (up to 100 characters, truncated with `[...]` if longer)
  - Build timestamp
- Falls back to 'dev' and 'Development version' if git is not available

### Display Location
- **Lobby only** - Version appears centered at the bottom of lobby screen
- **Not in game** - Keeps gameplay area clean
- **Styling**: Monospace italic font, grey color (#888888)
- Initially shows "Game Version: dev" then updates asynchronously once version file loads

### Implementation Details
- Uses dynamic ES6 `import()` to load version file
- Works in both development (Vite) and production (bundled)
- Gracefully falls back to 'dev' if version file cannot be loaded
- Asynchronous loading prevents blocking lobby UI initialization

### Files
- `scripts/generate-version.js` - Version generation script
- `src/generated/version.ts` - Auto-generated version file (gitignored)
- `src/client/scenes/LobbyScene.ts` - Version displayed here (around line 337)

## Deployment
Works with Render's git-based deployment:
1. Developer commits to git
2. Render pulls repository (includes .git folder)
3. `npm run build` executes (runs `prebuild` hook)
4. `scripts/generate-version.js` reads git commit hash
5. Version baked into build and displayed in lobby

## Manual Update
To manually update the version display:
```bash
npm run gen
```

## Customization
Edit the version display in `src/client/scenes/LobbyScene.ts` (around line 337):
- Position (currently centered at bottom with 10px padding)
- Font size (currently 12px)
- Font style (currently italic)
- Color (currently #888888 grey)
- Font family (currently monospace)
- Commit message length limit (currently 100 characters, edit in `scripts/generate-version.js`)

## Troubleshooting

### Version shows 'dev' instead of commit hash
1. Ensure version file was generated: `npm run gen`
2. Check that `src/generated/version.ts` exists
3. Restart dev server to pick up changes
4. Refresh browser

### Version doesn't update after new commit
Run the generation script manually:
```bash
npm run gen
```
Or restart the dev server (will run automatically via `predev` hook)

### TypeScript errors about missing version module
If you're getting errors like "Cannot find module '../../generated/version'":
1. Run `npm run gen` to generate the version file
2. This is required for first-time setup and CI/CD pipelines

