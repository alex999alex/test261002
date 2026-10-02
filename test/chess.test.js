import assert from "node:assert/strict";
import test from "node:test";
import {
  algebraic,
  analyze,
  applyMove,
  createGame,
  legalMoves,
  parseFen,
  perft,
  square,
  toSAN,
} from "../js/chess.js";

function play(state, uci) {
  const from = square(uci.slice(0, 2));
  const to = square(uci.slice(2, 4));
  const promotion = uci[4] || null;
  const move = legalMoves(state).find(
    (candidate) =>
      candidate.from === from &&
      candidate.to === to &&
      (candidate.promotion || null) === promotion,
  );
  assert.ok(move, `expected legal move ${uci}`);
  return { state: applyMove(state, move), move, san: toSAN(state, move) };
}

test("starting position has the standard twenty moves", () => {
  const game = createGame();
  const moves = legalMoves(game);
  assert.equal(moves.length, 20);
  assert.equal(analyze(game).status, "playing");
  assert.ok(moves.some((move) => algebraic(move.from) === "e2" && algebraic(move.to) === "e4"));
  assert.ok(moves.some((move) => algebraic(move.from) === "b1" && algebraic(move.to) === "c3"));
  assert.equal(moves.some((move) => algebraic(move.from) === "e2" && algebraic(move.to) === "e5"), false);
  assert.equal(moves.some((move) => algebraic(move.from) === "e1"), false);
});

test("perft counts match known positions", () => {
  const cases = [
    ["start", createGame(), [20, 400, 8902]],
    [
      "kiwipete",
      parseFen("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1"),
      [48, 2039, 97862],
    ],
    [
      "position 3",
      parseFen("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1"),
      [14, 191, 2812],
    ],
    [
      "promotions and castling",
      parseFen("r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1"),
      [6, 264, 9467],
    ],
  ];
  for (const [name, state, expected] of cases) {
    expected.forEach((nodes, index) => {
      assert.equal(perft(state, index + 1), nodes, `${name} depth ${index + 1}`);
    });
  }
});

test("castling moves the rook and spends the right", () => {
  let state = createGame();
  for (const uci of ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5"]) {
    state = play(state, uci).state;
  }
  const castled = play(state, "e1g1");
  assert.equal(castled.san, "O-O");
  assert.equal(castled.state.board[square("g1")]?.type, "k");
  assert.equal(castled.state.board[square("f1")]?.type, "r");
  assert.equal(castled.state.board[square("e1")], null);
  assert.equal(castled.state.board[square("h1")], null);
  assert.equal(castled.state.castling.K, false);
  assert.equal(castled.state.castling.Q, false);
});

test("castling is illegal through check or out of check", () => {
  const through = parseFen("4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1");
  const throughMoves = legalMoves(through).filter((move) => move.castle);
  assert.deepEqual(
    throughMoves.map((move) => move.castle),
    ["queenside"],
  );

  const inCheck = parseFen("4r3/8/8/8/8/8/8/R3K2R w KQ - 0 1");
  assert.equal(analyze(inCheck).status, "check");
  assert.equal(
    legalMoves(inCheck).some((move) => move.castle),
    false,
  );
});

test("en passant captures the passed pawn and then expires", () => {
  let state = createGame();
  for (const uci of ["e2e4", "a7a6", "e4e5", "d7d5"]) {
    state = play(state, uci).state;
  }
  assert.equal(algebraic(state.enPassant), "d6");
  const capture = play(state, "e5d6");
  assert.equal(capture.move.enPassant, true);
  assert.equal(capture.san, "exd6");
  assert.equal(capture.state.board[square("d6")]?.type, "p");
  assert.equal(capture.state.board[square("d6")]?.color, "w");
  assert.equal(capture.state.board[square("d5")], null);
  assert.equal(capture.state.board[square("e5")], null);

  const quiet = play(state, "a2a3");
  assert.equal(quiet.state.enPassant, null);
  assert.equal(
    legalMoves(quiet.state).some((move) => move.enPassant),
    false,
  );
});

test("en passant that exposes the king is illegal", () => {
  const state = parseFen("k7/8/8/2KPp2r/8/8/8/8 w - e6 0 1");
  assert.equal(analyze(state).status, "playing");
  assert.equal(
    legalMoves(state).some((move) => move.enPassant),
    false,
  );
});

test("promotion offers four pieces", () => {
  const state = parseFen("k7/4P3/8/8/8/8/8/4K3 w - - 0 1");
  const promotions = legalMoves(state).filter((move) => move.promotion);
  assert.deepEqual(
    promotions.map((move) => move.promotion).sort(),
    ["b", "n", "q", "r"],
  );
  const queen = promotions.find((move) => move.promotion === "q");
  const next = applyMove(state, queen);
  assert.equal(next.board[square("e8")]?.type, "q");
  assert.equal(toSAN(state, queen), "e8=Q+");
});

test("a pinned knight cannot move", () => {
  const state = parseFen("4r3/8/8/8/8/8/4N3/4K3 w - - 0 1");
  assert.equal(
    legalMoves(state).some((move) => algebraic(move.from) === "e2"),
    false,
  );
});

test("scholar's mate, fool's mate, and stalemate", () => {
  let scholars = createGame();
  const scholarsSans = [];
  for (const uci of ["e2e4", "e7e5", "d1h5", "b8c6", "f1c4", "g8f6", "h5f7"]) {
    const step = play(scholars, uci);
    scholars = step.state;
    scholarsSans.push(step.san);
  }
  assert.deepEqual(scholarsSans, ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"]);
  assert.equal(analyze(scholars).status, "checkmate");

  let fools = createGame();
  for (const uci of ["f2f3", "e7e5", "g2g4", "d8h4"]) fools = play(fools, uci).state;
  assert.equal(analyze(fools).status, "checkmate");

  const stale = parseFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
  assert.equal(analyze(stale).status, "stalemate");
  assert.equal(analyze(stale).inCheck, false);
});
