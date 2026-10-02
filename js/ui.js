import { chooseMove } from "./ai.js";
import { algebraic, analyze, applyMove, createGame, toSAN } from "./chess.js";

const PIECE_FILE = {
  wk: "Chess_klt45.svg",
  wq: "Chess_qlt45.svg",
  wr: "Chess_rlt45.svg",
  wb: "Chess_blt45.svg",
  wn: "Chess_nlt45.svg",
  wp: "Chess_plt45.svg",
  bk: "Chess_kdt45.svg",
  bq: "Chess_qdt45.svg",
  br: "Chess_rdt45.svg",
  bb: "Chess_bdt45.svg",
  bn: "Chess_ndt45.svg",
  bp: "Chess_pdt45.svg",
};

const PIECE_NAME = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
};

const PROMO_ORDER = ["q", "r", "b", "n"];
const CAPTURE_ORDER = { q: 0, r: 1, b: 2, n: 3, p: 4 };

const boardEl = document.querySelector("#board");
const statusEl = document.querySelector("#status");
const movesEl = document.querySelector("#moves");
const promoEl = document.querySelector("#promo");
const toastEl = document.querySelector("#toast");
const hintEl = document.querySelector("#hint");
const eyebrowEl = document.querySelector("#eyebrow");
const newGameBtn = document.querySelector("#new-game");
const modeButtons = {
  computer: document.querySelector("#mode-computer"),
  hotseat: document.querySelector("#mode-hotseat"),
};
const capturedEls = {
  w: document.querySelector("#cap-w"),
  b: document.querySelector("#cap-b"),
};

let state = createGame();
let view = analyze(state);
let mode = "computer";
let thinking = false;
let thinkTimer = 0;
let selected = null;
let lastMove = null;
let history = [];
let captures = { w: [], b: [] };
let drag = null;
let promoMoves = null;
let promoArmed = false;
let toastTimer = 0;

function pieceSrc(piece) {
  return `assets/pieces/${PIECE_FILE[piece.color + piece.type]}`;
}

function squareLabel(sq, piece) {
  const name = algebraic(sq);
  if (!piece) return `Empty square ${name}`;
  const side = piece.color === "w" ? "White" : "Black";
  return `${side} ${PIECE_NAME[piece.type]} on ${name}`;
}

function buildBoard() {
  const fragment = document.createDocumentFragment();
  for (let rank = 7; rank >= 0; rank--) {
    for (let file = 0; file < 8; file++) {
      const sq = rank * 8 + file;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `square ${(file + rank) % 2 === 0 ? "dark" : "light"}`;
      button.dataset.sq = String(sq);
      button.setAttribute("role", "gridcell");
      if (file === 0) {
        const rankLabel = document.createElement("span");
        rankLabel.className = "coord rank";
        rankLabel.textContent = String(rank + 1);
        button.appendChild(rankLabel);
      }
      if (rank === 0) {
        const fileLabel = document.createElement("span");
        fileLabel.className = "coord file";
        fileLabel.textContent = "abcdefgh"[file];
        button.appendChild(fileLabel);
      }
      const piece = document.createElement("span");
      piece.className = "piece";
      button.appendChild(piece);
      fragment.appendChild(button);
    }
  }
  boardEl.appendChild(fragment);
}

function showToast(message) {
  toastEl.hidden = false;
  toastEl.textContent = message;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.hidden = true;
  }, 1600);
}

function closePromo() {
  promoMoves = null;
  promoArmed = false;
  promoEl.hidden = true;
  promoEl.innerHTML = "";
}

function openPromo(moves) {
  promoMoves = moves;
  promoArmed = false;
  const to = moves[0].to;
  const squareEl = boardEl.querySelector(`[data-sq="${to}"]`);
  const boardRect = boardEl.getBoundingClientRect();
  const squareRect = squareEl.getBoundingClientRect();
  const available = PROMO_ORDER.filter((type) => moves.some((move) => move.promotion === type));
  promoEl.innerHTML = "";
  promoEl.hidden = false;
  promoEl.style.width = `${squareRect.width}px`;
  promoEl.style.left = `${squareRect.left - boardRect.left}px`;
  const stackHeight = squareRect.width * available.length;
  const top =
    state.turn === "w"
      ? squareRect.top - boardRect.top
      : squareRect.bottom - boardRect.top - stackHeight;
  promoEl.style.top = `${top}px`;

  for (const type of available) {
    const move = moves.find((candidate) => candidate.promotion === type);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "promo-choice";
    button.setAttribute("aria-label", `Promote to ${PIECE_NAME[type]}`);
    const img = document.createElement("img");
    img.alt = "";
    img.src = pieceSrc({ color: state.turn, type });
    button.appendChild(img);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      closePromo();
      commit(move);
    });
    promoEl.appendChild(button);
  }
  window.setTimeout(() => {
    if (promoMoves) promoArmed = true;
  }, 0);
}

function commit(move) {
  if (move.captured) captures[state.turn].push(move.captured);
  history.push(toSAN(state, move, view.moves));
  lastMove = { from: move.from, to: move.to };
  state = applyMove(state, move);
  selected = null;
  drag = null;
  paint();
  queueComputer();
}

function queueComputer() {
  if (mode !== "computer" || state.turn !== "b") return;
  if (view.status === "checkmate" || view.status === "stalemate") return;
  thinking = true;
  paint();
  window.clearTimeout(thinkTimer);
  thinkTimer = window.setTimeout(() => {
    const move = chooseMove(state);
    thinking = false;
    if (!move) {
      paint();
      return;
    }
    commit(move);
  }, 420);
}

function movesTo(from, to) {
  return view.moves.filter((move) => move.from === from && move.to === to);
}

function tryMove(from, to) {
  const options = movesTo(from, to);
  if (options.length === 0) {
    showToast("That move isn’t legal.");
    paint();
    return;
  }
  if (options.some((move) => move.promotion)) {
    selected = from;
    openPromo(options);
    paint();
    return;
  }
  commit(options[0]);
}

function statusCopy() {
  const side = state.turn === "w" ? "White" : "Black";
  if (view.status === "checkmate") {
    if (mode === "computer") {
      const youWin = state.turn === "b";
      return { text: youWin ? "Checkmate — you win" : "Checkmate — computer wins", dot: youWin ? "w" : "b" };
    }
    const winner = state.turn === "w" ? "Black" : "White";
    return { text: `Checkmate — ${winner} wins`, dot: state.turn === "w" ? "b" : "w" };
  }
  if (view.status === "stalemate") return { text: "Stalemate — draw", dot: null };
  if (mode === "computer") {
    if (thinking || state.turn === "b") {
      return {
        text: view.status === "check" ? "Computer is in check" : "Computer is thinking",
        dot: "b",
      };
    }
    if (view.status === "check") return { text: "You are in check", dot: "w" };
    return { text: "Your turn", dot: "w" };
  }
  if (view.status === "check") return { text: `${side} is in check`, dot: state.turn };
  return { text: `${side} to move`, dot: state.turn };
}

function paint() {
  view = analyze(state);
  const targets = new Set();
  const capturesOn = new Set();
  if (selected != null && !view.status.endsWith("mate") && view.status !== "stalemate") {
    for (const move of view.moves) {
      if (move.from !== selected) continue;
      targets.add(move.to);
      if (move.captured) capturesOn.add(move.to);
    }
  }

  for (const squareEl of boardEl.children) {
    const sq = Number(squareEl.dataset.sq);
    const piece = state.board[sq];
    squareEl.classList.toggle("selected", sq === selected);
    squareEl.classList.toggle("last", Boolean(lastMove && (sq === lastMove.from || sq === lastMove.to)));
    squareEl.classList.toggle("target", targets.has(sq));
    squareEl.classList.toggle("capture", capturesOn.has(sq));
    const checkedKing =
      view.inCheck && piece?.type === "k" && piece.color === state.turn;
    squareEl.classList.toggle("check", Boolean(checkedKing));
    const holder = squareEl.querySelector(".piece");
    const src = piece ? pieceSrc(piece) : "";
    if (holder.dataset.src !== src) {
      holder.dataset.src = src;
      holder.replaceChildren();
      if (src) {
        const img = document.createElement("img");
        img.alt = "";
        img.draggable = false;
        img.src = src;
        holder.appendChild(img);
      }
    }
    holder.classList.toggle("lifting", Boolean(drag?.moved && drag.from === sq));
    squareEl.setAttribute("aria-label", squareLabel(sq, piece));
    squareEl.setAttribute("aria-pressed", sq === selected ? "true" : "false");
  }

  const copy = statusCopy();
  statusEl.className = `status ${view.status}${thinking ? " thinking" : ""}`;
  boardEl.classList.toggle("locked", thinking);
  statusEl.replaceChildren();
  if (copy.dot) {
    const dot = document.createElement("i");
    dot.className = `dot ${copy.dot}`;
    dot.setAttribute("aria-hidden", "true");
    statusEl.appendChild(dot);
  }
  statusEl.append(copy.text);

  const over = view.status === "checkmate" || view.status === "stalemate";
  if (over) hintEl.textContent = "Start a new game to play again.";
  else if (mode === "computer") {
    hintEl.textContent = "You play White. Click or drag a piece. The computer plays Black.";
  } else {
    hintEl.textContent = "Click a piece, then a highlighted square. You can also drag.";
  }
  eyebrowEl.textContent = mode === "computer" ? "You play White" : "Two players, one device";

  paintCaptures();
  paintHistory();
}

function paintCaptures() {
  for (const color of ["w", "b"]) {
    const el = capturedEls[color];
    el.replaceChildren();
    const taken = captures[color].slice().sort((a, b) => CAPTURE_ORDER[a] - CAPTURE_ORDER[b]);
    if (taken.length === 0) {
      const empty = document.createElement("span");
      empty.className = "none";
      empty.textContent = "None";
      el.appendChild(empty);
      continue;
    }
    const victim = color === "w" ? "b" : "w";
    for (const type of taken) {
      const img = document.createElement("img");
      img.alt = PIECE_NAME[type];
      img.src = pieceSrc({ color: victim, type });
      el.appendChild(img);
    }
  }
}

function paintHistory() {
  movesEl.replaceChildren();
  if (history.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No moves yet";
    movesEl.appendChild(empty);
    return;
  }
  for (let i = 0; i < history.length; i += 2) {
    const row = document.createElement("li");
    const num = document.createElement("span");
    num.className = "num";
    num.textContent = String(i / 2 + 1);
    const white = document.createElement("span");
    white.textContent = history[i];
    const black = document.createElement("span");
    black.textContent = history[i + 1] || "";
    row.append(num, white, black);
    movesEl.appendChild(row);
  }
  movesEl.scrollTop = movesEl.scrollHeight;
}

function resetGame() {
  window.clearTimeout(thinkTimer);
  thinking = false;
  closePromo();
  drag?.ghost?.remove();
  drag = null;
  state = createGame();
  selected = null;
  lastMove = null;
  history = [];
  captures = { w: [], b: [] };
  toastEl.hidden = true;
  paint();
}

function setMode(next) {
  if (next === mode) return;
  mode = next;
  for (const [name, button] of Object.entries(modeButtons)) {
    const on = name === mode;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", on ? "true" : "false");
  }
  resetGame();
}

function placeGhost(piece, size, x, y) {
  const ghost = document.createElement("div");
  ghost.className = "ghost";
  ghost.style.width = `${size}px`;
  ghost.style.height = `${size}px`;
  const img = document.createElement("img");
  img.alt = "";
  img.src = pieceSrc(piece);
  ghost.appendChild(img);
  document.body.appendChild(ghost);
  ghost.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`;
  return ghost;
}

function endDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const info = drag;
  drag = null;
  info.ghost?.remove();
  if (boardEl.hasPointerCapture(event.pointerId)) {
    boardEl.releasePointerCapture(event.pointerId);
  }
  if (!info.moved) {
    if (info.toggleOff) selected = null;
    paint();
    return;
  }
  const hit = document.elementFromPoint(event.clientX, event.clientY);
  const destEl = hit?.closest?.("[data-sq]");
  const dest = destEl ? Number(destEl.dataset.sq) : null;
  if (dest != null && dest !== info.from) {
    tryMove(info.from, dest);
    return;
  }
  selected = info.from;
  paint();
}

boardEl.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  const squareEl = event.target.closest("[data-sq]");
  if (!squareEl || promoMoves || thinking) return;
  if (mode === "computer" && state.turn !== "w") return;
  if (view.status === "checkmate" || view.status === "stalemate") return;
  const sq = Number(squareEl.dataset.sq);
  const piece = state.board[sq];
  const ownPiece = piece && piece.color === state.turn;

  if (!ownPiece) {
    if (selected != null) tryMove(selected, sq);
    return;
  }

  event.preventDefault();
  const toggleOff = selected === sq;
  selected = sq;
  const rect = squareEl.getBoundingClientRect();
  drag = {
    pointerId: event.pointerId,
    from: sq,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    toggleOff,
    size: rect.width,
    ghost: null,
  };
  boardEl.setPointerCapture(event.pointerId);
  paint();
});

boardEl.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) {
    return;
  }
  drag.moved = true;
  if (!drag.ghost) {
    drag.ghost = placeGhost(state.board[drag.from], drag.size * 0.92, event.clientX, event.clientY);
    paint();
  }
  drag.ghost.style.transform = `translate(${event.clientX - drag.size * 0.46}px, ${event.clientY - drag.size * 0.46}px)`;
});

boardEl.addEventListener("pointerup", endDrag);
boardEl.addEventListener("pointercancel", (event) => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  drag.ghost?.remove();
  drag = null;
  paint();
});

document.addEventListener("pointerdown", (event) => {
  if (!promoArmed) return;
  if (event.target.closest("#promo")) return;
  closePromo();
  paint();
});

newGameBtn.addEventListener("click", resetGame);
modeButtons.computer.addEventListener("click", () => setMode("computer"));
modeButtons.hotseat.addEventListener("click", () => setMode("hotseat"));
boardEl.addEventListener("contextmenu", (event) => event.preventDefault());

buildBoard();
paint();
