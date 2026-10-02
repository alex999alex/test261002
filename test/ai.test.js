import assert from "node:assert/strict";
import test from "node:test";
import { chooseMove } from "../js/ai.js";
import { algebraic, applyMove, createGame, legalMoves, parseFen } from "../js/chess.js";

test("the computer chooses a legal move", () => {
  const move = chooseMove(createGame(), 2);
  assert.ok(move);
  assert.ok(
    legalMoves(createGame()).some(
      (candidate) => candidate.from === move.from && candidate.to === move.to,
    ),
  );
});

test("the computer captures a hanging queen", () => {
  const state = parseFen("r1bqkbnr/pppp1ppp/2n5/4p3/3Q4/8/PPP1PPPP/RNB1KBNR b KQkq - 0 3");
  const move = chooseMove(state, 2);
  assert.equal(algebraic(move.from), "c6");
  assert.equal(algebraic(move.to), "d4");
  assert.equal(move.captured, "q");
});

test("the computer plays mate in one", () => {
  const state = parseFen("rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2");
  const move = chooseMove(state, 2);
  assert.equal(`${algebraic(move.from)}${algebraic(move.to)}`, "d8h4");
});

test("a short game stays legal", () => {
  let state = createGame();
  for (let ply = 0; ply < 6; ply++) {
    const move = chooseMove(state, 2);
    assert.ok(move, `move ${ply}`);
    state = applyMove(state, move);
  }
});
