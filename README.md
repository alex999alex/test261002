# Chess

A two-player chess page for one device. White and Black alternate turns on the same board. Moves follow standard chess rules, including castling, en passant, and promotion. The page shows check, checkmate, and stalemate, and a new game restores the starting position.

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

Click one of your pieces, then a highlighted square. Dragging onto a legal square also moves. Pawns that reach the last rank open a promotion choice. Illegal drops are refused.

Chess piece artwork by Colin M.L. Burnett, released to the public domain.
