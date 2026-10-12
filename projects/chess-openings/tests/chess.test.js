// Tests for the chess engine and the opening data.
// Run from projects/chess-openings with:  node --test tests/
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/chess.js');
const OPENINGS = require('../js/openings.js');

// Count leaf positions reachable in `depth` plies (standard "perft" check)
function perft(state, depth) {
  if (depth === 0) return 1;
  const moves = E.legalMoves(state, false);
  if (depth === 1) return moves.length;
  let total = 0;
  for (const m of moves) total += perft(E.makeMove(state, m), depth - 1);
  return total;
}

// Play a list of SAN moves from the start, failing the test if any move is illegal
function play(sans, from) {
  let state = from || E.startState();
  for (const san of sans) {
    const m = E.findMove(state, san);
    assert.ok(m, `illegal or unknown move "${san}"`);
    state = E.makeMove(state, m);
  }
  return state;
}

test('perft: start position matches known counts', () => {
  const s = E.startState();
  assert.equal(perft(s, 1), 20);
  assert.equal(perft(s, 2), 400);
  assert.equal(perft(s, 3), 8902);
});

test('perft: "Kiwipete" position (castling, en passant, promotions)', () => {
  const s = E.fromFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
  assert.equal(perft(s, 1), 48);
  assert.equal(perft(s, 2), 2039);
});

test('perft: endgame position with en passant and pins', () => {
  const s = E.fromFen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
  assert.equal(perft(s, 1), 14);
  assert.equal(perft(s, 2), 191);
  assert.equal(perft(s, 3), 2812);
});

test('SAN: knight moves are disambiguated by file when needed', () => {
  // Knights on b1 and f1 can both reach d2
  const s = E.fromFen('4k3/8/8/8/8/8/8/1N3N1K w - - 0 1');
  const sans = E.legalMoves(s).map((m) => m.san);
  assert.ok(sans.includes('Nbd2'));
  assert.ok(sans.includes('Nfd2'));
  assert.ok(!sans.includes('Nd2'));
});

test('SAN: check and checkmate suffixes (fool\'s mate)', () => {
  const s = play(['f3', 'e5', 'g4']);
  const mate = E.findMove(s, 'Qh4#');
  assert.ok(mate, 'Qh4 should be legal');
  assert.equal(mate.san, 'Qh4#');
  const after = E.makeMove(s, mate);
  assert.ok(E.gameStatus(after).checkmate);
});

test('castling: both sides available and moves the rook too', () => {
  const s = E.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const sans = E.legalMoves(s).map((m) => m.san);
  assert.ok(sans.includes('O-O'));
  assert.ok(sans.includes('O-O-O'));
  const next = E.makeMove(s, E.findMove(s, 'O-O'));
  assert.equal(next.board[5].t, 'r'); // f1 now holds a rook
  assert.equal(next.board[7], null);  // h1 is empty
});

test('castling: not allowed through an attacked square', () => {
  // Black rook on f8 attacks f1, so White cannot castle kingside
  const s = E.fromFen('5r2/8/8/8/8/8/8/R3K2R w KQ - 0 1');
  assert.equal(E.findMove(s, 'O-O'), null);
});

test('en passant capture is offered right after a double push', () => {
  const s = E.fromFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
  const m = E.findMove(s, 'exd6');
  assert.ok(m, 'exd6 should be legal');
  const next = E.makeMove(s, m);
  assert.equal(next.board[idx('d5')], null); // captured pawn removed
});

function idx(name) {
  return (name.charCodeAt(0) - 97) + (Number(name[1]) - 1) * 8;
}

test('promotion creates the chosen piece', () => {
  const s = E.fromFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  const queen = E.findMove(s, 'a8=Q'); // SAN here is "a8=Q+", so matching ignores the check mark
  assert.ok(queen);
  const next = E.makeMove(s, queen);
  assert.equal(next.board[idx('a8')].t, 'q');
});

test('every opening line in the library is legal from the start position', () => {
  for (const opening of OPENINGS) {
    const sans = opening.moves.map((mv) => mv.san);
    assert.doesNotThrow(() => play(sans), `${opening.name} has an illegal move`);
    assert.ok(opening.moves.every((mv) => mv.note && mv.note.length > 0), `${opening.name} has a move without a note`);
    assert.ok(opening.side === 'w' || opening.side === 'b', `${opening.name} needs a side`);
  }
});

test('explainMove: a central pawn push is described as taking the centre', () => {
  const lines = E.explainMove(E.startState(), E.findMove(E.startState(), 'e4'));
  assert.ok(lines[0].includes('moves the pawn from e2 to e4'));
  assert.ok(lines.some((l) => l.includes('central square')));
});

test('explainMove: warns when the moved piece lands undefended on an attacked square', () => {
  // Knight g4 jumps to e5, where the black pawn on f6 captures it. Nothing defends e5.
  const s = E.fromFen('4k3/8/5p2/8/6N1/8/8/4K3 w - - 0 1');
  const lines = E.explainMove(s, E.findMove(s, 'Ne5'));
  assert.ok(lines.some((l) => l.includes('NOT defended')));
});

test('explainMove: reports a piece left hanging by the move', () => {
  // White's queen on d4 is undefended and Black's rook on d8 attacks it down the d-file.
  // White plays h3, which does nothing about the queen, so the explanation should flag it.
  const s = E.fromFen('3r2k1/8/8/8/3Q4/8/6PP/6K1 w - - 0 1');
  const lines = E.explainMove(s, E.findMove(s, 'h3'));
  assert.ok(lines.some((l) => l.includes('captured with nothing defending it')));
});
