# Rating Epic Games

Browse and filter every free Epic Games Store giveaway with Metacritic scores, Steam reviews, user scores, playtime data, and free dates.

## Features

- **351 games** — every Epic Games Store free giveaway tracked
- Metacritic critic and user scores
- Steam user review ratings with review counts
- HowLongToBeat completion times with color-coded display
- Free dates — when each game was given away (including repeats)
- Game thumbnails from Steam
- Search, sort, and filter by any column
- Filter by year, rating tier, score range, playtime
- Toggleable column visibility
- Hide games you're not interested in
- Import your game library
- Shareable filter URLs via hash parameters
- Dark theme, responsive layout
- Keyboard shortcut: `/` to focus search

## Development

```bash
npm install
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
npm test          # Run tests
```

## Data

Game data lives in `public/game_data.json`. Each entry contains:

| Section | Fields |
|---------|--------|
| `steam` | appid, rating, pct, total, image |
| `metacritic` | score, user_score, slug |
| `epic` | slug, free_dates (start/end pairs) |

## Tech Stack

- Vite + React 19 + TypeScript
- No external UI libraries

can we refactor the code further to improve readability and extensiblity 

what does the project structure look like now

are there any code related to columns thats not in the column class

how can we improve the blank space on the right side left by the vertical scroll bar