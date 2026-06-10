/*jslint browser, module*/

import {
    createGame,
    movePlayer,
    countTiles,
    isValidMove,
    getPlayerPosition,
    getAvailableMoves,
    MOM,
    BABY
} from "./game.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let game      = createGame();
let moveCount = 0;

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if (r, c) is a reachable move for the current player.
 *
 * @param {number} r - Row index.
 * @param {number} c - Column index.
 * @returns {boolean}
 */
const isAvailableMove = function (r, c) {
    const position = getPlayerPosition(game.currentPlayer, game);
    return isValidMove(position.row, position.col, r, c);
};

/**
 * Builds and returns an accessible tile <button> for position (r, c).
 * The button carries full ARIA context: tile type, player occupancy, and
 * whether it is a reachable move this turn.
 *
 * @param {number} r - Row index (0-indexed).
 * @param {number} c - Column index (0-indexed).
 * @returns {HTMLButtonElement}
 */
const buildTileButton = function (r, c) {

    const tile   = game.board[r][c];
    const button = document.createElement("button");

    button.className  = "tile " + tile;
    button.setAttribute("role", "gridcell");

    const isMom  = game.momPosition.row  === r && game.momPosition.col  === c;
    const isBaby = game.babyPosition.row === r && game.babyPosition.col === c;

    const tileLabels = {
        N:   "Neutral",
        C:   "Clean",
        M:   "Messy",
        P:   "Portal",
        O_B: "Castle Built",
        O_C: "Castle Collapsed"
    };

    const tileLabel = tileLabels[tile] || tile;

    const occupant = isMom ? MOM : (isBaby ? BABY : null);
    const coord = "Row " + String(r + 1) + " Column " + String(c + 1) + ": " + tileLabel;

    if (occupant) {
        const name = occupant === MOM ? "Mom" : "Baby";
        const img = document.createElement("img");
        img.src       = "assets/" + name.toLowerCase() + ".png";
        img.className = "character-icon" + (game.currentPlayer === occupant ? " active-character" : "");
        img.alt       = name;
        button.appendChild(img);
        button.setAttribute("aria-label", coord + " – " + name + " is here");
    } else {
        button.setAttribute("aria-label", coord);
    }

    if (isAvailableMove(r, c)) {
        button.classList.add("available-move");
        button.setAttribute("aria-description", "Available move – press to move here");
    } else {
        button.setAttribute("tabindex", "-1");
        button.setAttribute("aria-disabled", "true");
    }

    button.addEventListener("click", function () {
        const prev = game;
        game = movePlayer(r, c, game);
        if (game !== prev) {
            moveCount += 1;
        }
        render();
    });

    return button;
};

// ---------------------------------------------------------------------------
// Render sections
// ---------------------------------------------------------------------------

/** Re-draws every tile on the board. */
const renderBoard = function () {

    const boardEl = document.querySelector(".board");
    boardEl.innerHTML = "";

    game.board.forEach(function (row, r) {
        row.forEach(function (ignore, c) {
            boardEl.appendChild(buildTileButton(r, c));
        });
    });
};

/** Updates the turn indicator, move counter, and hazard warning. */
const renderTurnInfo = function () {

    const turnEl = document.querySelector(".turn-player");
    turnEl.innerHTML = game.currentPlayer +
        "<span class=\"blink-cursor\" aria-hidden=\"true\">_</span>";

    const warningEl = document.querySelector(".warning-text");
    warningEl.textContent = game.currentPlayer === MOM
        ? "Avoid messy tiles."
        : "Avoid clean tiles.";

    const counterEl = document.querySelector(".move-counter");
    if (counterEl) {
        counterEl.textContent = String(moveCount);
    }
};

/** Updates scores, heart displays, and castle progress bars. */
const renderStats = function () {

    const counts = countTiles(game.board);

    document.querySelector(".mom-score").textContent  = String(counts.built)     + "/5";
    document.querySelector(".baby-score").textContent = String(counts.collapsed) + "/5";

    const momHeartsEl  = document.querySelector(".mom-hearts");
    const babyHeartsEl = document.querySelector(".baby-hearts");

    momHeartsEl.innerHTML  = "❤️".repeat(game.momLives);
    babyHeartsEl.innerHTML = "❤️".repeat(game.babyLives);
    momHeartsEl.setAttribute("aria-label",  "Mom lives: " + String(game.momLives));
    babyHeartsEl.setAttribute("aria-label", "Baby lives: " + String(game.babyLives));

    const momFill  = document.querySelector(".mom-fill");
    const babyFill = document.querySelector(".baby-fill");
    momFill.style.width  = String((counts.built     / 5) * 100) + "%";
    babyFill.style.width = String((counts.collapsed / 5) * 100) + "%";

    const momBar  = document.querySelector("[aria-label='Mom castle progress']");
    const babyBar = document.querySelector("[aria-label='Baby castle progress']");
    if (momBar)  { momBar.setAttribute("aria-valuenow",  String(counts.built)); }
    if (babyBar) { babyBar.setAttribute("aria-valuenow", String(counts.collapsed)); }
};

/** Announces and briefly displays the round result, then advances the game. */
const renderRoundStatus = function () {

    const statusEl = document.querySelector(".game-status");

    if (game.isGameOver) {

        statusEl.textContent = game.winner + " WON THIS ROUND";

        setTimeout(function () {
            game = Object.assign({}, game, {isGameOver: false, winner: null});
            render();
        }, 1400);

    } else {

        statusEl.textContent = "";
    }
};

/** Reveals the game-over overlay and shifts focus to the restart button. */
const renderOverlay = function () {

    const overlayEl = document.querySelector(".game-over-overlay");

    if (game.finalGameOver) {

        const winnerName = game.momLives <= 0
            ? BABY
            : MOM;

        document.querySelector(".final-winner").textContent =
            winnerName + " WINS THE MATCH!";

        overlayEl.classList.remove("hidden");
        overlayEl.removeAttribute("aria-hidden");
        document.querySelector(".restart-btn").focus();

    } else {

        overlayEl.classList.add("hidden");
        overlayEl.setAttribute("aria-hidden", "true");
    }
};

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------

/** Full re-render of every UI section from the current game state. */
const render = function () {
    renderBoard();
    renderTurnInfo();
    renderStats();
    renderRoundStatus();
    renderOverlay();
};

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

document.addEventListener("keydown", function (event) {

    const directionMap = {
        ArrowUp:    {dr: -1, dc:  0},
        ArrowDown:  {dr:  1, dc:  0},
        ArrowLeft:  {dr:  0, dc: -1},
        ArrowRight: {dr:  0, dc:  1}
    };

    const direction = directionMap[event.key];

    if (!direction) {
        return;
    }

    event.preventDefault();

    const position  = getPlayerPosition(game.currentPlayer, game);
    const targetRow = position.row + direction.dr;
    const targetCol = position.col + direction.dc;
    const prev      = game;

    game = movePlayer(targetRow, targetCol, game);

    if (game !== prev) {
        moveCount += 1;
    }

    render();
});

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

document.querySelector(".restart-btn").addEventListener("click", function () {
    game      = createGame();
    moveCount = 0;
    render();
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

render();