/**
 * Chess rules: legal moves, castling, en passant, promotion,
 * check, checkmate, and stalemate.
 *
 * Squares are 0..63, a1 = 0, files increase toward h, ranks toward 8.
 */

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const KNIGHT_DELTAS = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
];
const KING_DELTAS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const BISHOP_DIRS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const ROOK_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const FILES = "abcdefgh";

export function fileOf(sq) {
  return sq & 7;
}

export function rankOf(sq) {
  return sq >> 3;
}

export function algebraic(sq) {
  return FILES[fileOf(sq)] + String(rankOf(sq) + 1);
}

export function square(algebraicName) {
  const file = algebraicName.charCodeAt(0) - 97;
  const rank = algebraicName.charCodeAt(1) - 49;
  return rank * 8 + file;
}

function onBoard(file, rank) {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

function opponent(color) {
  return color === "w" ? "b" : "w";
}

export function parseFen(fen) {
  const [placement, turn, castling, ep, halfmove, fullmove] = fen.trim().split(/\s+/);
  const board = Array(64).fill(null);
  const ranks = placement.split("/");
  for (let row = 0; row < 8; row++) {
    let file = 0;
    for (const ch of ranks[row]) {
      if (ch >= "1" && ch <= "8") {
        file += Number(ch);
        continue;
      }
      const color = ch === ch.toUpperCase() ? "w" : "b";
      const rank = 7 - row;
      board[rank * 8 + file] = { color, type: ch.toLowerCase() };
      file += 1;
    }
  }
  return {
    board,
    turn,
    castling: {
      K: castling.includes("K"),
      Q: castling.includes("Q"),
      k: castling.includes("k"),
      q: castling.includes("q"),
    },
    enPassant: ep === "-" ? null : square(ep),
    halfmove: Number(halfmove || 0),
    fullmove: Number(fullmove || 1),
  };
}

export function createGame() {
  return parseFen(START_FEN);
}

function findKing(board, color) {
  for (let i = 0; i < 64; i++) {
    const piece = board[i];
    if (piece && piece.color === color && piece.type === "k") return i;
  }
  return -1;
}

function rayHits(board, file, rank, df, dr, byColor, types) {
  let f = file + df;
  let r = rank + dr;
  while (onBoard(f, r)) {
    const piece = board[r * 8 + f];
    if (piece) return piece.color === byColor && types.includes(piece.type);
    f += df;
    r += dr;
  }
  return false;
}

/** True when `byColor` attacks `sq` on `board`. */
export function isAttacked(board, sq, byColor) {
  const file = fileOf(sq);
  const rank = rankOf(sq);
  const pawnRank = rank + (byColor === "w" ? -1 : 1);
  for (const df of [-1, 1]) {
    const pf = file + df;
    if (!onBoard(pf, pawnRank)) continue;
    const piece = board[pawnRank * 8 + pf];
    if (piece && piece.color === byColor && piece.type === "p") return true;
  }
  for (const [df, dr] of KNIGHT_DELTAS) {
    const f = file + df;
    const r = rank + dr;
    if (!onBoard(f, r)) continue;
    const piece = board[r * 8 + f];
    if (piece && piece.color === byColor && piece.type === "n") return true;
  }
  for (const [df, dr] of KING_DELTAS) {
    const f = file + df;
    const r = rank + dr;
    if (!onBoard(f, r)) continue;
    const piece = board[r * 8 + f];
    if (piece && piece.color === byColor && piece.type === "k") return true;
  }
  for (const [df, dr] of BISHOP_DIRS) {
    if (rayHits(board, file, rank, df, dr, byColor, ["b", "q"])) return true;
  }
  for (const [df, dr] of ROOK_DIRS) {
    if (rayHits(board, file, rank, df, dr, byColor, ["r", "q"])) return true;
  }
  return false;
}

function kingInCheck(board, color) {
  const kingSq = findKing(board, color);
  if (kingSq < 0) return false;
  return isAttacked(board, kingSq, opponent(color));
}

export function sideInCheck(state) {
  return kingInCheck(state.board, state.turn);
}

function pushMove(moves, from, to, captured, extra = {}) {
  moves.push({
    from,
    to,
    captured: captured || null,
    promotion: extra.promotion || null,
    enPassant: Boolean(extra.enPassant),
    castle: extra.castle || null,
  });
}

function addPawnMoves(state, from, moves) {
  const piece = state.board[from];
  const dir = piece.color === "w" ? 1 : -1;
  const startRank = piece.color === "w" ? 1 : 6;
  const lastRank = piece.color === "w" ? 7 : 0;
  const file = fileOf(from);
  const rank = rankOf(from);
  const oneRank = rank + dir;

  if (onBoard(file, oneRank) && !state.board[oneRank * 8 + file]) {
    const to = oneRank * 8 + file;
    if (oneRank === lastRank) {
      for (const promotion of ["q", "r", "b", "n"]) {
        pushMove(moves, from, to, null, { promotion });
      }
    } else {
      pushMove(moves, from, to, null);
    }
    const twoRank = rank + dir * 2;
    if (rank === startRank && !state.board[twoRank * 8 + file]) {
      pushMove(moves, from, twoRank * 8 + file, null);
    }
  }

  for (const df of [-1, 1]) {
    const cf = file + df;
    if (!onBoard(cf, oneRank)) continue;
    const to = oneRank * 8 + cf;
    const target = state.board[to];
    if (target && target.color !== piece.color) {
      if (oneRank === lastRank) {
        for (const promotion of ["q", "r", "b", "n"]) {
          pushMove(moves, from, to, target.type, { promotion });
        }
      } else {
        pushMove(moves, from, to, target.type);
      }
    } else if (!target && state.enPassant === to) {
      const cap = state.board[rank * 8 + cf];
      if (cap && cap.type === "p" && cap.color !== piece.color) {
        pushMove(moves, from, to, "p", { enPassant: true });
      }
    }
  }
}

function addSlider(board, from, color, dirs, moves) {
  const file = fileOf(from);
  const rank = rankOf(from);
  for (const [df, dr] of dirs) {
    let f = file + df;
    let r = rank + dr;
    while (onBoard(f, r)) {
      const to = r * 8 + f;
      const target = board[to];
      if (!target) pushMove(moves, from, to, null);
      else {
        if (target.color !== color) pushMove(moves, from, to, target.type);
        break;
      }
      f += df;
      r += dr;
    }
  }
}

function addLeaper(board, from, color, deltas, moves) {
  const file = fileOf(from);
  const rank = rankOf(from);
  for (const [df, dr] of deltas) {
    const f = file + df;
    const r = rank + dr;
    if (!onBoard(f, r)) continue;
    const to = r * 8 + f;
    const target = board[to];
    if (!target) pushMove(moves, from, to, null);
    else if (target.color !== color) pushMove(moves, from, to, target.type);
  }
}

function addCastling(state, moves) {
  const { board, castling, turn } = state;
  const enemy = opponent(turn);
  if (turn === "w") {
    const kingHome = board[4]?.type === "k" && board[4]?.color === "w";
    if (
      kingHome &&
      castling.K &&
      board[7]?.type === "r" &&
      board[7]?.color === "w" &&
      !board[5] &&
      !board[6] &&
      !isAttacked(board, 4, enemy) &&
      !isAttacked(board, 5, enemy) &&
      !isAttacked(board, 6, enemy)
    ) {
      pushMove(moves, 4, 6, null, { castle: "kingside" });
    }
    if (
      kingHome &&
      castling.Q &&
      board[0]?.type === "r" &&
      board[0]?.color === "w" &&
      !board[1] &&
      !board[2] &&
      !board[3] &&
      !isAttacked(board, 4, enemy) &&
      !isAttacked(board, 3, enemy) &&
      !isAttacked(board, 2, enemy)
    ) {
      pushMove(moves, 4, 2, null, { castle: "queenside" });
    }
    return;
  }
  const kingHome = board[60]?.type === "k" && board[60]?.color === "b";
  if (
    kingHome &&
    castling.k &&
    board[63]?.type === "r" &&
    board[63]?.color === "b" &&
    !board[61] &&
    !board[62] &&
    !isAttacked(board, 60, enemy) &&
    !isAttacked(board, 61, enemy) &&
    !isAttacked(board, 62, enemy)
  ) {
    pushMove(moves, 60, 62, null, { castle: "kingside" });
  }
  if (
    kingHome &&
    castling.q &&
    board[56]?.type === "r" &&
    board[56]?.color === "b" &&
    !board[57] &&
    !board[58] &&
    !board[59] &&
    !isAttacked(board, 60, enemy) &&
    !isAttacked(board, 59, enemy) &&
    !isAttacked(board, 58, enemy)
  ) {
    pushMove(moves, 60, 58, null, { castle: "queenside" });
  }
}

function pseudoMoves(state) {
  const moves = [];
  for (let from = 0; from < 64; from++) {
    const piece = state.board[from];
    if (!piece || piece.color !== state.turn) continue;
    if (piece.type === "p") addPawnMoves(state, from, moves);
    else if (piece.type === "n") addLeaper(state.board, from, piece.color, KNIGHT_DELTAS, moves);
    else if (piece.type === "b") addSlider(state.board, from, piece.color, BISHOP_DIRS, moves);
    else if (piece.type === "r") addSlider(state.board, from, piece.color, ROOK_DIRS, moves);
    else if (piece.type === "q") {
      addSlider(state.board, from, piece.color, BISHOP_DIRS, moves);
      addSlider(state.board, from, piece.color, ROOK_DIRS, moves);
    } else if (piece.type === "k") addLeaper(state.board, from, piece.color, KING_DELTAS, moves);
  }
  addCastling(state, moves);
  return moves;
}

function clearRookRight(rights, sq) {
  if (sq === 0) rights.Q = false;
  else if (sq === 7) rights.K = false;
  else if (sq === 56) rights.q = false;
  else if (sq === 63) rights.k = false;
}

export function applyMove(state, move) {
  const board = state.board.slice();
  const piece = board[move.from];
  board[move.from] = null;

  if (move.enPassant) {
    const capRank = rankOf(move.to) + (piece.color === "w" ? -1 : 1);
    board[capRank * 8 + fileOf(move.to)] = null;
  }

  board[move.to] = move.promotion ? { color: piece.color, type: move.promotion } : piece;

  if (move.castle === "kingside") {
    if (piece.color === "w") {
      board[5] = board[7];
      board[7] = null;
    } else {
      board[61] = board[63];
      board[63] = null;
    }
  } else if (move.castle === "queenside") {
    if (piece.color === "w") {
      board[3] = board[0];
      board[0] = null;
    } else {
      board[59] = board[56];
      board[56] = null;
    }
  }

  const castling = { ...state.castling };
  clearRookRight(castling, move.from);
  clearRookRight(castling, move.to);
  if (piece.type === "k") {
    if (piece.color === "w") {
      castling.K = false;
      castling.Q = false;
    } else {
      castling.k = false;
      castling.q = false;
    }
  }

  let enPassant = null;
  if (piece.type === "p" && Math.abs(rankOf(move.to) - rankOf(move.from)) === 2) {
    enPassant = ((rankOf(move.from) + rankOf(move.to)) / 2) * 8 + fileOf(move.from);
  }

  const captured = Boolean(move.captured);
  const halfmove = piece.type === "p" || captured ? 0 : state.halfmove + 1;

  return {
    board,
    turn: opponent(state.turn),
    castling,
    enPassant,
    halfmove,
    fullmove: state.fullmove + (state.turn === "b" ? 1 : 0),
  };
}

export function legalMoves(state) {
  const moves = [];
  for (const move of pseudoMoves(state)) {
    const next = applyMove(state, move);
    if (!kingInCheck(next.board, state.turn)) moves.push(move);
  }
  return moves;
}

export function analyze(state) {
  const moves = legalMoves(state);
  const inCheck = kingInCheck(state.board, state.turn);
  let status = "playing";
  if (moves.length === 0) status = inCheck ? "checkmate" : "stalemate";
  else if (inCheck) status = "check";
  return { moves, inCheck, status };
}

function sameDestinationPieces(state, move, moves) {
  const type = state.board[move.from].type;
  return moves.filter((other) => {
    if (other.from === move.from || other.to !== move.to) return false;
    if (other.promotion !== move.promotion) return false;
    return state.board[other.from]?.type === type;
  });
}

function disambiguation(state, move, moves) {
  const others = sameDestinationPieces(state, move, moves);
  if (others.length === 0) return "";
  const file = fileOf(move.from);
  const rank = rankOf(move.from);
  const fileClash = others.some((other) => fileOf(other.from) === file);
  const rankClash = others.some((other) => rankOf(other.from) === rank);
  if (!fileClash) return FILES[file];
  if (!rankClash) return String(rank + 1);
  return FILES[file] + String(rank + 1);
}

function checkSuffix(state, move) {
  const next = applyMove(state, move);
  if (!kingInCheck(next.board, next.turn)) return "";
  return legalMoves(next).length === 0 ? "#" : "+";
}

/** Standard algebraic notation for a legal move. */
export function toSAN(state, move, moves = legalMoves(state)) {
  const mark = checkSuffix(state, move);
  if (move.castle === "kingside") return `O-O${mark}`;
  if (move.castle === "queenside") return `O-O-O${mark}`;
  const piece = state.board[move.from];
  let text = "";
  if (piece.type === "p") {
    if (move.captured) text += FILES[fileOf(move.from)] + "x";
    text += algebraic(move.to);
    if (move.promotion) text += `=${move.promotion.toUpperCase()}`;
  } else {
    text += piece.type.toUpperCase();
    text += disambiguation(state, move, moves);
    if (move.captured) text += "x";
    text += algebraic(move.to);
  }
  return text + mark;
}

export function perft(state, depth) {
  const moves = legalMoves(state);
  if (depth <= 1) return moves.length;
  let nodes = 0;
  for (const move of moves) nodes += perft(applyMove(state, move), depth - 1);
  return nodes;
}
