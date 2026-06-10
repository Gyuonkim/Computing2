/*jslint browser, module*/

/**
 * @module game
 * @description
 * Game module for Cleanup Chaos – a two-player turn-based board game.
 *
 * MOM tries to build all 5 castle objectives (O_C → O_B).
 * BABY tries to collapse all 5 castle objectives (O_B → O_C).
 * Each player has 3 lives; losing all lives ends the match permanently.
 *
 * Tile states:
 * - "N"   Neutral   – safe for both players; MOM cleans it, BABY messes it.
 * - "C"   Clean     – MOM cleaned it; BABY cannot step on it without losing a life.
 * - "M"   Messy     – BABY messed it; MOM cannot step on it without losing a life.
 * - "P"   Portal    – permanent centre tile; no effect when stepped on.
 * - "O_B" Built     – castle is built; counts toward MOM's win condition.
 * - "O_C" Collapsed – castle is collapsed; counts toward BABY's win condition.
 */

/**
 * The MOM player token.
 * @constant {string}
 */
export const MOM = "MOM";

/**
 * The BABY player token.
 * @constant {string}
 */
export const BABY = "BABY";

/**
 * The side-length of the square board.
 * @constant {number}
 */
const BOARD_SIZE = 5;

/**
 * The number of castle objectives on the board.
 * @constant {number}
 */
const OBJECTIVE_COUNT = 5;

/**
 * The number of lives each player starts a match with.
 * @constant {number}
 */
const STARTING_LIVES = 3;

// ---------------------------------------------------------------------------
// Board helpers (pure)
// ---------------------------------------------------------------------------

/**
 * Creates a blank 5×5 board of Neutral tiles, places five castle objectives
 * at random non-corner, non-centre positions, then stamps the permanent
 * Portal tile at the centre (row 2, col 2).
 *
 * @returns {string[][]} A freshly initialised 5×5 tile grid.
 */
const createBoard = function () {

    const blank = Array.from(
        {length: BOARD_SIZE},
        function () {
            return Array(BOARD_SIZE).fill("N");
        }
    );

    return placeObjectives(blank).map(function (row, r) {
        return row.map(function (tile, c) {
            return (r === 2 && c === 2) ? "P" : tile;
        });
    });
};

/**
 * Returns a new board with five castle objectives placed at randomly chosen
 * positions, avoiding the player start corners and the centre Portal cell.
 * A random split of 2 or 3 objectives begin as Built (O_B); the rest
 * start as Collapsed (O_C).
 *
 * @param {string[][]} board - The source board to place objectives onto.
 * @returns {string[][]} A new board with objectives inserted.
 */
const placeObjectives = function (board) {

    const isBlocked = function (row, col) {
        return (
            (row === 0 && col === 0) ||
            (row === BOARD_SIZE - 1 && col === BOARD_SIZE - 1) ||
            (row === 2 && col === 2)
        );
    };

    const addPosition = function (positions) {

        if (positions.length === OBJECTIVE_COUNT) {
            return positions;
        }

        const row = Math.floor(Math.random() * BOARD_SIZE);
        const col = Math.floor(Math.random() * BOARD_SIZE);

        const isDuplicate = positions.some(function (p) {
            return p.row === row && p.col === col;
        });

        if (isBlocked(row, col) || isDuplicate) {
            return addPosition(positions);
        }

        return addPosition(positions.concat([{row: row, col: col}]));
    };

    const positions = addPosition([]);
    const builtCount = Math.random() > 0.5
        ? 3
        : 2;

    return positions.reduce(function (acc, pos, index) {
        return acc.map(function (row, r) {
            return row.map(function (tile, c) {
                if (r === pos.row && c === pos.col) {
                    return index < builtCount
                        ? "O_B"
                        : "O_C";
                }
                return tile;
            });
        });
    }, board);
};

// ---------------------------------------------------------------------------
// Tile logic helpers (pure)
// ---------------------------------------------------------------------------

/**
 * Returns the tile state that results from a player stepping onto it.
 * Call {@link checkImmediateLose} before this to guard lethal tiles.
 *
 * Effects by player:
 * - MOM  turns Neutral → Clean, Messy → Clean, Collapsed → Built.
 * - BABY turns Neutral → Messy, Clean → Messy, Built → Collapsed.
 *
 * @param {string} player - {@link MOM} or {@link BABY}.
 * @param {string} tile   - The tile being entered.
 * @returns {string} The resulting tile state.
 */
const applyTileEffect = function (player, tile) {

    const effects = {
        [MOM]:  {N: "C", M: "C", O_C: "O_B"},
        [BABY]: {N: "M", C: "M", O_B: "O_C"}
    };

    return (effects[player] && effects[player][tile]) || tile;
};

/**
 * Determines whether entering a tile is lethal for the moving player.
 * MOM cannot safely step on Messy tiles; BABY cannot safely step on Clean tiles.
 *
 * @param {string} player - The player attempting the move.
 * @param {string} tile   - The tile being entered.
 * @returns {string|null} The token of the player who loses a life, or null.
 */
const checkImmediateLose = function (player, tile) {

    if (player === MOM && tile === "M") {
        return MOM;
    }

    if (player === BABY && tile === "C") {
        return BABY;
    }

    return null;
};

// ---------------------------------------------------------------------------
// State queries (pure, exported)
// ---------------------------------------------------------------------------

/**
 * Counts the number of Built and Collapsed castle tiles on the board.
 *
 * @param {string[][]} board - The current 5×5 tile grid.
 * @returns {{ built: number, collapsed: number }} Objective tile counts.
 */
export const countTiles = function (board) {

    return board.reduce(function (totals, row) {
        return row.reduce(function (acc, tile) {
            return {
                built:     acc.built     + (tile === "O_B" ? 1 : 0),
                collapsed: acc.collapsed + (tile === "O_C" ? 1 : 0)
            };
        }, totals);
    }, {built: 0, collapsed: 0});
};

/**
 * Returns true when a move from one cell to an adjacent cell is within the
 * one-step range (orthogonal and diagonal), and the source and target differ.
 *
 * @param {number} fromRow - The mover's current row index (0-indexed).
 * @param {number} fromCol - The mover's current column index (0-indexed).
 * @param {number} toRow   - The target row index.
 * @param {number} toCol   - The target column index.
 * @returns {boolean} True if the move is geometrically valid.
 */
export const isValidMove = function (fromRow, fromCol, toRow, toCol) {

    const rowDiff = Math.abs(fromRow - toRow);
    const colDiff = Math.abs(fromCol - toCol);

    return (
        rowDiff <= 1 &&
        colDiff <= 1 &&
        !(rowDiff === 0 && colDiff === 0)
    );
};

/**
 * Returns every board position the current player may move to on their turn.
 * Positions are returned in reading order (top-left to bottom-right).
 *
 * @param {GameState} game - The current game state.
 * @returns {{ row: number, col: number }[]} Array of reachable positions.
 */
export const getAvailableMoves = function (game) {

    const position = getPlayerPosition(game.currentPlayer, game);
    const indices  = [0, 1, 2, 3, 4];

    return indices.reduce(function (moves, r) {
        return indices.reduce(function (acc, c) {
            if (isValidMove(position.row, position.col, r, c)) {
                return acc.concat([{row: r, col: c}]);
            }
            return acc;
        }, moves);
    }, []);
};

/**
 * Returns the current board position of the given player.
 *
 * @param {string}    player - {@link MOM} or {@link BABY}.
 * @param {GameState} game   - The current game state.
 * @returns {{ row: number, col: number }} The player's board position.
 */
export const getPlayerPosition = function (player, game) {
    return player === MOM
        ? game.momPosition
        : game.babyPosition;
};

/**
 * Returns the token of the player who is not currently taking their turn.
 *
 * @param {string} player - {@link MOM} or {@link BABY}.
 * @returns {string} The opponent's token.
 */
export const getOpponent = function (player) {
    return player === MOM
        ? BABY
        : MOM;
};

/**
 * Returns the number of lives remaining for the given player.
 *
 * @param {string}    player - {@link MOM} or {@link BABY}.
 * @param {GameState} game   - The current game state.
 * @returns {number} Lives remaining (0 means the match is over).
 */
export const getLives = function (player, game) {
    return player === MOM
        ? game.momLives
        : game.babyLives;
};

/**
 * Returns true when the match has ended because one player has no lives left.
 *
 * @param {GameState} game - The current game state.
 * @returns {boolean} True if the overall match is finished.
 */
export const isMatchOver = function (game) {
    return game.finalGameOver;
};

// ---------------------------------------------------------------------------
// State constructors (pure)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} GameState
 * @property {string[][]}              board         - The 5×5 tile grid.
 * @property {string}                  currentPlayer - Token of the player whose turn it is.
 * @property {string|null}             winner        - Token of the round winner, or null.
 * @property {boolean}                 isGameOver    - True when the current round has ended.
 * @property {boolean}                 finalGameOver - True when the overall match is finished.
 * @property {number}                  momLives      - MOM's remaining lives.
 * @property {number}                  babyLives     - BABY's remaining lives.
 * @property {{ row: number, col: number }} momPosition  - MOM's current position.
 * @property {{ row: number, col: number }} babyPosition - BABY's current position.
 */

/**
 * Creates a fresh round, optionally carrying over lives from the previous
 * round so that a multi-round match can be tracked across resets.
 *
 * MOM starts at (0, 0); BABY starts at (4, 4).
 * The first player is determined by the objective split: whichever side has
 * fewer objectives starts first (MOM if equal or fewer Built).
 *
 * @param {Object}  [prev]                 - Values to carry over from the previous round.
 * @param {number}  [prev.momLives]        - MOM's remaining lives.
 * @param {number}  [prev.babyLives]       - BABY's remaining lives.
 * @param {boolean} [prev.finalGameOver]   - Whether the match is already over.
 * @returns {GameState} A new, ready-to-play game state.
 */
export const createGame = function (prev) {

    const carry = prev || {};
    const board  = createBoard();
    const counts = countTiles(board);

    return {
        board:         board,
        currentPlayer: counts.built < counts.collapsed
            ? MOM
            : BABY,
        winner:        null,
        isGameOver:    false,
        finalGameOver: carry.finalGameOver || false,
        momLives:      carry.momLives  !== undefined
            ? carry.momLives
            : STARTING_LIVES,
        babyLives:     carry.babyLives !== undefined
            ? carry.babyLives
            : STARTING_LIVES,
        momPosition:   {row: 0, col: 0},
        babyPosition:  {row: BOARD_SIZE - 1, col: BOARD_SIZE - 1}
    };
};

/**
 * Constructs the end-of-round state shown between rounds.
 * Lives are already decremented by the caller; this function determines
 * whether the match is now permanently over and resets the board.
 *
 * @param {string} roundWinner - Token of the player who won this round.
 * @param {number} momLives    - MOM's lives after the penalty.
 * @param {number} babyLives   - BABY's lives after the penalty.
 * @returns {GameState} Round-over state with a fresh board for the next round.
 */
const buildRoundOverState = function (roundWinner, momLives, babyLives) {

    const finalGameOver = momLives <= 0 || babyLives <= 0;

    return Object.assign(
        {},
        createGame({
            momLives:      momLives,
            babyLives:     babyLives,
            finalGameOver: finalGameOver
        }),
        {
            winner:       roundWinner,
            isGameOver:   true,
            finalGameOver: finalGameOver
        }
    );
};

// ---------------------------------------------------------------------------
// State transitions (pure, exported)
// ---------------------------------------------------------------------------

/**
 * Attempts to move the current player to the target position and returns
 * the resulting game state. The source state is returned unchanged if the
 * move is geometrically invalid or the match is already over.
 *
 * Possible outcomes (evaluated in order):
 * 1. **Match over or invalid move** – state is returned unchanged.
 * 2. **Lethal tile** – the player stepped on a tile forbidden to them
 *    (MOM on Messy, BABY on Clean); they lose a life and a new round begins.
 * 3. **Objective victory** – all five castles are Built (MOM wins) or all
 *    five are Collapsed (BABY wins); the losing player loses a life and a
 *    new round begins.
 * 4. **Normal move** – the tile is updated, the turn passes to the opponent.
 *
 * @param {number}    row  - Target row (0-indexed).
 * @param {number}    col  - Target column (0-indexed).
 * @param {GameState} game - The state to transition from.
 * @returns {GameState} The next game state.
 */
export const movePlayer = function (row, col, game) {

    if (game.finalGameOver) {
        return game;
    }

    const player   = game.currentPlayer;
    const position = getPlayerPosition(player, game);

    if (!isValidMove(position.row, position.col, row, col)) {
        return game;
    }

    const tile  = game.board[row][col];
    const loser = checkImmediateLose(player, tile);

    // --- Lethal tile: player loses a life ---

    if (loser) {
        const momLives  = loser === MOM  ? game.momLives  - 1 : game.momLives;
        const babyLives = loser === BABY ? game.babyLives - 1 : game.babyLives;
        return buildRoundOverState(getOpponent(loser), momLives, babyLives);
    }

    // --- Apply tile transformation ---

    const nextBoard = game.board.map(function (r, ri) {
        return r.map(function (t, ci) {
            return (ri === row && ci === col)
                ? applyTileEffect(player, t)
                : t;
        });
    });

    // --- Objective win condition ---

    const counts  = countTiles(nextBoard);
    const momWin  = counts.built     === OBJECTIVE_COUNT;
    const babyWin = counts.collapsed === OBJECTIVE_COUNT;

    if (momWin || babyWin) {
        const roundWinner = momWin ? MOM : BABY;
        const roundLoser  = getOpponent(roundWinner);
        const momLives    = roundLoser === MOM  ? game.momLives  - 1 : game.momLives;
        const babyLives   = roundLoser === BABY ? game.babyLives - 1 : game.babyLives;
        return buildRoundOverState(roundWinner, momLives, babyLives);
    }

    // --- Normal turn: update position and hand over to opponent ---

    return Object.assign({}, game, {
        board:         nextBoard,
        isGameOver:    false,
        winner:        null,
        momPosition:   player === MOM  ? {row: row, col: col} : game.momPosition,
        babyPosition:  player === BABY ? {row: row, col: col} : game.babyPosition,
        currentPlayer: getOpponent(player)
    });
};