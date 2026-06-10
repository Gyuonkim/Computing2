# Cleanup Chaos

A two-player turn-based board game built as a web application.
MOM and BABY compete on a 5×5 grid — MOM tries to build all the lego castles, BABY tries to collapse them.

---

## Game rules

### Players

| Player | Starts at | Goal |
|--------|-----------|------|
| MOM | Top-left (0, 0) | Build all 5 castles |
| BABY | Bottom-right (4, 4) | Collapse all 5 castles |

Lego tiles are generated at random positions each turn.

Each player starts with **3 lives**, displayed as hearts (❤️❤️❤️). Losing a round costs one life — so you need to **win 3 rounds** to win overall.

### Movement

On your turn, move to any adjacent tile — including diagonals (up to 8 directions, one step at a time). Click a glowing tile or use the arrow keys.

### Tiles

| Tile | Effect |
|------|--------|
| Neutral | Safe for both players. MOM turns it Clean; BABY turns it Messy. |
| Clean | MOM's territory — BABY cannot step here without losing a life. |
| Messy | BABY's territory — MOM cannot step here without losing a life. |
| Portal | Permanent centre tile. No effect when stepped on. |
| Built castle | MOM repaired it. Counts toward MOM's win condition. BABY can collapse it. |
| Collapsed castle | BABY destroyed it. Counts toward BABY's win condition. MOM can rebuild it. |

### Winning a round

- **MOM** wins the round by stepping onto the last Collapsed castle, making all 5 Built.
- **BABY** wins the round by stepping onto the last Built castle, making all 5 Collapsed.
- A player also wins the round if their opponent steps onto a lethal tile.

The losing player loses one life, and a new round begins with a fresh board. Lives carry over between rounds.

