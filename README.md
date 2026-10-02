# Chess

A chess page you can play as White against the computer, or as a two-player game on one device. Moves follow standard chess rules, including castling, en passant, and promotion. The page shows check, checkmate, and stalemate, and a new game restores the starting position.

## Run

From this directory:

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

## Test the rules

```bash
node --test
```

The move generator is checked against known perft counts, plus castling, en passant, promotion, pins, checkmate, and stalemate.

## Play

Vs computer is the default: you play White, and Black replies on its own. Two players switches back to taking turns on one device. Click a piece, then a highlighted square, or drag it. Pawns that reach the last rank open a promotion choice. Illegal drops are refused.

Chess piece artwork by Colin M.L. Burnett, released to the public domain.
