# Candy Bingo

Candy Bingo is a lightweight mobile-first 75-ball Bingo game. It generates a standard 5x5 ticket (free center cell) and lets you draw numbers from the universe until you hit a winning line (row/column/diagonal) or all numbers are exhausted.

## Features
- 75-number universe grid with dynamic highlighting.
- Auto-generated ticket with correct column ranges (B 1–15, I 16–30, N 31–45, G 46–60, O 61–75).
- Free center cell.
- Visual states: drawn numbers, matches, last drawn highlight, win notification.
 - Full House winner popup modal with replay controls.
- Accessible live regions for last draw and win announcement.
- Mobile-first responsive layout, touch-friendly buttons, high-contrast design.
- Simple toast notifications and subtle animations.
- Haptic feedback via Vibration API (where supported).

## Usage
Open `index.html` in a mobile browser or a desktop browser with device toolbar.

1. Press Draw to pull the next random number.
2. Matching ticket cells highlight automatically.
 3. Keep drawing until every numbered cell is matched for a Full House.
4. Press Reset to start a new game.

## File Overview
- `index.html` – Structure & ARIA regions.
- `style.css` – Mobile-first styles.
- `script.js` – Game logic & interactions.

## Extend Ideas
- Track multiple players / tickets.
- Persist history of draws.
- Add settings panel for animations or color themes.
- Sound effects (with mute toggle).
- Progressive Web App (installable) wrapper.
- Shareable game sessions with WebSocket realtime multiplayer.

## Accessibility Notes
- Live regions announce draws and wins.
- Focus returns to Draw button when game ends for quick keyboard interaction.
- High contrast color scheme; gradients avoid critical information conveyance.

## License
Prototype intended for demonstration/educational use. Adapt freely.
