
/**
 * @file game.test.js
 * @description
 * Behaviour tests for the Cleanup Chaos game module.
 *
 * The describe/it hierarchy doubles as a rulebook: reading the block headings
 * top-to-bottom gives a complete picture of how the game works, even without
 * knowing the implementation.
 *
 * Run with:  npm test  (requires Node >= 18)
 */

import {describe, it} from "node:test";
import assert from "node:assert/strict";

import {
    MOM,
    BABY,
    createGame,
    movePlayer,
    countTiles,
    isValidMove,
    getAvailableMoves,
    getPlayerPosition,
    getOpponent,
    getLives,
    isMatchOver
} from "../game.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Builds a controlled GameState by merging overrides onto sensible defaults.
 * The default board is a plain 5×5 of Neutral tiles with the centre Portal.
 */
const makeGame = function (overrides) {
    return Object.assign(
        {
            board: [
                ["N", "N", "N", "N", "N"],
                ["N", "N", "N", "N", "N"],
                ["N", "N", "P", "N", "N"],
                ["N", "N", "N", "N", "N"],
                ["N", "N", "N", "N", "N"]
            ],
            currentPlayer: MOM,
            winner:        null,
            isGameOver:    false,
            finalGameOver: false,
            momLives:      3,
            babyLives:     3,
            momPosition:   {row: 0, col: 0},
            babyPosition:  {row: 4, col: 4}
        },
        overrides
    );
};

/** Builds a 5×5 board from a flat array of 25 tile strings (row-major order). */
const makeBoard = function (tiles) {
    return [0, 1, 2, 3, 4].map(function (r) {
        return [0, 1, 2, 3, 4].map(function (c) {
            return tiles[r * 5 + c];
        });
    });
};

// ---------------------------------------------------------------------------
// The board
// ---------------------------------------------------------------------------

describe("The board", function () {

    it("is a 5×5 grid", function () {
        const game = createGame();
        assert.equal(game.board.length, 5);
        assert.ok(game.board.every(function (row) { return row.length === 5; }));
    });

    it("has a permanent Portal tile fixed at the centre (row 2, col 2)", function () {
        assert.equal(createGame().board[2][2], "P");
    });

    it("starts each round with exactly 5 castle objectives placed on the board", function () {
        const {built, collapsed} = countTiles(createGame().board);
        assert.equal(built + collapsed, 5);
    });

});

// ---------------------------------------------------------------------------
// The two players
// ---------------------------------------------------------------------------

describe("The two players – MOM vs BABY", function () {

    it("MOM starts every round at the top-left corner (row 0, col 0)", function () {
        assert.deepEqual(createGame().momPosition, {row: 0, col: 0});
    });

    it("BABY starts every round at the bottom-right corner (row 4, col 4)", function () {
        assert.deepEqual(createGame().babyPosition, {row: 4, col: 4});
    });

    it("each player begins a new match with 3 lives", function () {
        const game = createGame();
        assert.equal(game.momLives,  3);
        assert.equal(game.babyLives, 3);
    });

    it("MOM and BABY alternate turns – after MOM moves, it is BABY's turn", function () {
        const next = movePlayer(0, 1, makeGame({currentPlayer: MOM}));
        assert.equal(next.currentPlayer, BABY);
    });

    it("getOpponent returns BABY when given MOM, and vice versa", function () {
        assert.equal(getOpponent(MOM),  BABY);
        assert.equal(getOpponent(BABY), MOM);
    });

});

// ---------------------------------------------------------------------------
// Movement rules
// ---------------------------------------------------------------------------

describe("Movement – how a player moves", function () {

    it("a player can step one cell in any of the 8 directions (including diagonals)", function () {
        assert.equal(isValidMove(0, 0, 0, 1), true);   // right
        assert.equal(isValidMove(0, 0, 1, 0), true);   // down
        assert.equal(isValidMove(0, 0, 1, 1), true);   // diagonal
        assert.equal(isValidMove(2, 2, 1, 2), true);   // up
        assert.equal(isValidMove(2, 2, 2, 1), true);   // left
    });

    it("a player cannot stay on the same cell – a move must change position", function () {
        assert.equal(isValidMove(2, 2, 2, 2), false);
    });

    it("a player cannot jump over cells – moves are limited to one step", function () {
        assert.equal(isValidMove(0, 0, 0, 2), false);   // two cells horizontal
        assert.equal(isValidMove(0, 0, 2, 2), false);   // two cells diagonal
    });

    it("a player in a corner has 3 possible moves", function () {
        const game = makeGame({currentPlayer: MOM, momPosition: {row: 0, col: 0}});
        assert.equal(getAvailableMoves(game).length, 3);
    });

    it("a player at the middle of an edge has 5 possible moves", function () {
        const game = makeGame({currentPlayer: MOM, momPosition: {row: 0, col: 2}});
        assert.equal(getAvailableMoves(game).length, 5);
    });

    it("a player at the centre of the board has 8 possible moves", function () {
        const game = makeGame({currentPlayer: MOM, momPosition: {row: 2, col: 2}});
        assert.equal(getAvailableMoves(game).length, 8);
    });

    it("getAvailableMoves uses the current player's actual position", function () {
        const game = makeGame({currentPlayer: BABY, babyPosition: {row: 4, col: 4}});
        assert.equal(getAvailableMoves(game).length, 3);
    });

    it("moving updates only the active player's position – the opponent does not move", function () {
        const game = makeGame({
            currentPlayer: MOM,
            momPosition:   {row: 0, col: 0},
            babyPosition:  {row: 4, col: 4}
        });
        const next = movePlayer(0, 1, game);
        assert.deepEqual(next.momPosition,  {row: 0, col: 1});
        assert.deepEqual(next.babyPosition, {row: 4, col: 4});
    });

    it("an illegal move (jumping two cells) is rejected and the state is unchanged", function () {
        const game = makeGame({momPosition: {row: 0, col: 0}});
        assert.equal(movePlayer(0, 2, game), game);
    });

    it("no move is accepted once the match has permanently ended", function () {
        const game = makeGame({finalGameOver: true});
        assert.equal(movePlayer(0, 1, game), game);
    });

});

// ---------------------------------------------------------------------------
// How tiles change as players walk
// ---------------------------------------------------------------------------

describe("Tile transformations – what footsteps leave behind", function () {

    it("MOM paints Neutral tiles Clean ('C') as she walks", function () {
        const game = makeGame({currentPlayer: MOM, momPosition: {row: 0, col: 0}});
        assert.equal(movePlayer(0, 1, game).board[0][1], "C");
    });

    it("BABY paints Neutral tiles Messy ('M') as she walks", function () {
        const game = makeGame({currentPlayer: BABY, babyPosition: {row: 4, col: 4}});
        assert.equal(movePlayer(4, 3, game).board[4][3], "M");
    });

    it("MOM repairs a Collapsed castle ('O_C') back to Built ('O_B') by stepping on it", function () {
        const board = makeBoard(Array(25).fill("N"));
        board[0][1] = "O_C";
        const game = makeGame({board, currentPlayer: MOM, momPosition: {row: 0, col: 0}});
        assert.equal(movePlayer(0, 1, game).board[0][1], "O_B");
    });

    it("BABY destroys a Built castle ('O_B') into Collapsed ('O_C') by stepping on it", function () {
        const board = makeBoard(Array(25).fill("N"));
        board[4][3] = "O_B";
        const game = makeGame({board, currentPlayer: BABY, babyPosition: {row: 4, col: 4}});
        assert.equal(movePlayer(4, 3, game).board[4][3], "O_C");
    });

});

// ---------------------------------------------------------------------------
// Lethal tiles – instant round loss
// ---------------------------------------------------------------------------

describe("Lethal tiles – stepping on the wrong tile ends the round", function () {

    it("Messy tiles are lethal for MOM – the round ends immediately when she steps on one", function () {
        const board = makeBoard(Array(25).fill("N"));
        board[0][1] = "M";
        const game = makeGame({board, currentPlayer: MOM, momPosition: {row: 0, col: 0}});
        const next  = movePlayer(0, 1, game);
        assert.equal(next.isGameOver, true);
        assert.equal(next.winner,     BABY);
    });

    it("MOM loses one life when she steps on a Messy tile", function () {
        const board = makeBoard(Array(25).fill("N"));
        board[0][1] = "M";
        const game = makeGame({board, currentPlayer: MOM, momPosition: {row: 0, col: 0}, momLives: 3});
        assert.equal(movePlayer(0, 1, game).momLives, 2);
    });

    it("Clean tiles are lethal for BABY – the round ends immediately when she steps on one", function () {
        const board = makeBoard(Array(25).fill("N"));
        board[4][3] = "C";
        const game = makeGame({board, currentPlayer: BABY, babyPosition: {row: 4, col: 4}});
        const next  = movePlayer(4, 3, game);
        assert.equal(next.isGameOver, true);
    });

    it("BABY loses one life when she steps on a Clean tile", function () {
        const board = makeBoard(Array(25).fill("N"));
        board[4][3] = "C";
        const game = makeGame({board, currentPlayer: BABY, babyPosition: {row: 4, col: 4}, babyLives: 2});
        assert.equal(movePlayer(4, 3, game).babyLives, 1);
    });

});

// ---------------------------------------------------------------------------
// Win conditions – how to win a round
// ---------------------------------------------------------------------------

describe("Win conditions – how to win a round", function () {

    it("MOM wins the round by building (repairing) all 5 castles", function () {
        // 4 already Built; MOM steps onto the last Collapsed one
        const tiles = Array(25).fill("N");
        tiles[1]  = "O_C";   // MOM's target (row 0, col 1)
        tiles[5]  = "O_B";
        tiles[10] = "O_B";
        tiles[15] = "O_B";
        tiles[20] = "O_B";

        const game = makeGame({
            board:         makeBoard(tiles),
            currentPlayer: MOM,
            momPosition:   {row: 0, col: 0}
        });
        const next = movePlayer(0, 1, game);

        assert.equal(next.isGameOver, true);
        assert.equal(next.winner,     MOM);
    });

    it("when MOM wins the round, BABY loses one life", function () {
        const tiles = Array(25).fill("N");
        tiles[1]  = "O_C";
        tiles[5]  = "O_B";
        tiles[10] = "O_B";
        tiles[15] = "O_B";
        tiles[20] = "O_B";

        const game = makeGame({
            board:         makeBoard(tiles),
            currentPlayer: MOM,
            momPosition:   {row: 0, col: 0},
            babyLives:     2
        });
        assert.equal(movePlayer(0, 1, game).babyLives, 1);
    });

    it("BABY wins the round by collapsing (destroying) all 5 castles", function () {
        // 4 already Collapsed; BABY steps onto the last Built one
        const tiles = Array(25).fill("N");
        tiles[23] = "O_B";   // BABY's target (row 4, col 3)
        tiles[1]  = "O_C";
        tiles[6]  = "O_C";
        tiles[11] = "O_C";
        tiles[16] = "O_C";

        const game = makeGame({
            board:         makeBoard(tiles),
            currentPlayer: BABY,
            babyPosition:  {row: 4, col: 4}
        });
        const next = movePlayer(4, 3, game);

        assert.equal(next.isGameOver, true);
        assert.equal(next.winner,     BABY);
    });

});

// ---------------------------------------------------------------------------
// Lives and match end
// ---------------------------------------------------------------------------

describe("Lives and match end – best-of-three rounds", function () {

    it("lives carry over from round to round", function () {
        assert.equal(createGame({momLives:  1}).momLives,  1);
        assert.equal(createGame({babyLives: 2}).babyLives, 2);
    });

    it("the match is still ongoing while both players have lives remaining", function () {
        assert.equal(isMatchOver(makeGame({finalGameOver: false})), false);
    });

    it("the match ends permanently the moment a player loses their last life", function () {
        const tiles = Array(25).fill("N");
        tiles[1]  = "O_C";
        tiles[5]  = "O_B";
        tiles[10] = "O_B";
        tiles[15] = "O_B";
        tiles[20] = "O_B";

        const game = makeGame({
            board:         makeBoard(tiles),
            currentPlayer: MOM,
            momPosition:   {row: 0, col: 0},
            babyLives:     1   // last life
        });
        const next = movePlayer(0, 1, game);

        assert.equal(next.finalGameOver, true);
        assert.equal(isMatchOver(next),  true);
    });

});