import { applyMove, legalMoves, sideInCheck } from "./chess.js";

const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function fromDiagram(text) {
  const values = text.trim().split(/\s+/).map(Number);
  const table = Array(64);
  for (let index = 0; index < 64; index++) {
    const rank = 7 - Math.floor(index / 8);
    const file = index % 8;
    table[rank * 8 + file] = values[index];
  }
  return table;
}

const PST = {
  p: fromDiagram(`
     0  0  0  0  0  0  0  0
    50 50 50 50 50 50 50 50
    10 10 20 30 30 20 10 10
     5  5 10 25 25 10  5  5
     0  0  0 20 20  0  0  0
     5 -5 -10 0  0 -10 -5  5
     5 10 10 -20 -20 10 10  5
     0  0  0  0  0  0  0  0
  `),
  n: fromDiagram(`
    -50 -40 -30 -30 -30 -30 -40 -50
    -40 -20   0   0   0   0 -20 -40
    -30   0  10  15  15  10   0 -30
    -30   5  15  20  20  15   5 -30
    -30   0  15  20  20  15   0 -30
    -30   5  10  15  15  10   5 -30
    -40 -20   0   5   5   0 -20 -40
    -50 -40 -30 -30 -30 -30 -40 -50
  `),
  b: fromDiagram(`
    -20 -10 -10 -10 -10 -10 -10 -20
    -10   0   0   0   0   0   0 -10
    -10   0   5  10  10   5   0 -10
    -10   5   5  10  10   5   5 -10
    -10   0  10  10  10  10   0 -10
    -10  10  10  10  10  10  10 -10
    -10   5   0   0   0   0   5 -10
    -20 -10 -10 -10 -10 -10 -10 -20
  `),
  r: fromDiagram(`
     0  0  0  0  0  0  0  0
     5 10 10 10 10 10 10  5
    -5  0  0  0  0  0  0 -5
    -5  0  0  0  0  0  0 -5
    -5  0  0  0  0  0  0 -5
    -5  0  0  0  0  0  0 -5
    -5  0  0  0  0  0  0 -5
     0  0  0  5  5  0  0  0
  `),
  q: fromDiagram(`
    -20 -10 -10 -5 -5 -10 -10 -20
    -10   0   0  0  0   0   0 -10
    -10   0   5  5  5   5   0 -10
     -5   0   5  5  5   5   0  -5
      0   0   5  5  5   5   0  -5
    -10   5   5  5  5   5   0 -10
    -10   0   5  0  0   0   0 -10
    -20 -10 -10 -5 -5 -10 -10 -20
  `),
  k: fromDiagram(`
    -30 -40 -40 -50 -50 -40 -40 -30
    -30 -40 -40 -50 -50 -40 -40 -30
    -30 -40 -40 -50 -50 -40 -40 -30
    -30 -40 -40 -50 -50 -40 -40 -30
    -20 -30 -30 -40 -40 -30 -30 -20
    -10 -20 -20 -20 -20 -20 -20 -10
     20  20   0   0   0   0  20  20
     20  30  10   0   0  10  30  20
  `),
};

function evaluate(state) {
  let score = 0;
  for (let sq = 0; sq < 64; sq++) {
    const piece = state.board[sq];
    if (!piece) continue;
    const sign = piece.color === "w" ? 1 : -1;
    const square = piece.color === "w" ? sq : sq ^ 56;
    score += sign * (VALUE[piece.type] + PST[piece.type][square]);
  }
  return state.turn === "w" ? score : -score;
}

function ordered(state, moves) {
  return moves.slice().sort((a, b) => rankMove(state, b) - rankMove(state, a));
}

function rankMove(state, move) {
  let score = 0;
  if (move.captured) {
    score += VALUE[move.captured] * 10 - VALUE[state.board[move.from].type];
  }
  if (move.promotion === "q") score += 800;
  else if (move.promotion) score += 200;
  return score;
}

function quiesce(state, alpha, beta, ply) {
  const stand = evaluate(state);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  if (ply >= 4) return alpha;
  const noisy = legalMoves(state).filter((move) => move.captured || move.promotion);
  for (const move of ordered(state, noisy)) {
    const score = -quiesce(applyMove(state, move), -beta, -alpha, ply + 1);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function negamax(state, depth, alpha, beta) {
  const moves = legalMoves(state);
  if (moves.length === 0) return sideInCheck(state) ? -100000 : 0;
  if (depth === 0) return quiesce(state, alpha, beta, 0);
  for (const move of ordered(state, moves)) {
    const score = -negamax(applyMove(state, move), depth - 1, -beta, -alpha);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

/** Best move for the side to move. Equal choices vary slightly between games. */
export function chooseMove(state, depth = 3) {
  const moves = ordered(state, legalMoves(state));
  if (moves.length === 0) return null;
  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const score = -negamax(applyMove(state, move), depth - 1, -Infinity, Infinity);
    const varied = score + Math.random();
    if (varied > bestScore) {
      bestScore = varied;
      best = move;
    }
  }
  return best;
}
