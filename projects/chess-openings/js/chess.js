/*
 * chess.js: a small chess rules engine with no dependencies.
 *
 * Squares are named like "e4". Internally the board is an array of 64 cells,
 * where index = rank * 8 + file (a1 = 0, h8 = 63). A cell is null or {t, c}:
 *   t = piece type: p n b r q k
 *   c = colour:     w or b
 *
 * In the browser this sets window.ChessEngine. In Node it uses module.exports.
 */
(function (root) {
  'use strict';

  const FILES = 'abcdefgh';
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const KNIGHT_STEPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const KING_STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const DIAGONALS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const STRAIGHTS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // Castling rights lost when a piece moves from, or is captured on, these squares
  const REVOKE = { a1: 'Q', e1: 'KQ', h1: 'K', a8: 'q', e8: 'kq', h8: 'k' };
  const CENTRE = ['d4', 'd5', 'e4', 'e5'];
  const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  const idx = (f, r) => r * 8 + f;
  const onBoard = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
  const sqName = (f, r) => FILES[f] + (r + 1);
  const parseSq = (s) => [FILES.indexOf(s[0]), Number(s[1]) - 1];
  const opponent = (c) => (c === 'w' ? 'b' : 'w');

  // Read a FEN string into a state object
  function fromFen(fen) {
    const parts = fen.trim().split(/\s+/);
    const board = new Array(64).fill(null);
    parts[0].split('/').forEach((row, i) => {
      const r = 7 - i;
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) {
          f += Number(ch);
        } else {
          board[idx(f, r)] = { t: ch.toLowerCase(), c: ch === ch.toUpperCase() ? 'w' : 'b' };
          f++;
        }
      }
    });
    return {
      board,
      turn: parts[1] || 'w',
      castling: parts[2] && parts[2] !== '-' ? parts[2] : '',
      ep: parts[3] && parts[3] !== '-' ? parts[3] : null,
      halfmove: Number(parts[4] || 0),
      fullmove: Number(parts[5] || 1),
    };
  }

  // Is square (f, r) attacked by any piece of colour `by`?
  function isAttacked(board, f, r, by) {
    const at = (ff, rr) => (onBoard(ff, rr) ? board[idx(ff, rr)] : null);
    // A white pawn attacks one rank up, so look one rank down from the target
    const pawnRank = by === 'w' ? r - 1 : r + 1;
    for (const df of [-1, 1]) {
      const p = at(f + df, pawnRank);
      if (p && p.c === by && p.t === 'p') return true;
    }
    for (const [df, dr] of KNIGHT_STEPS) {
      const p = at(f + df, r + dr);
      if (p && p.c === by && p.t === 'n') return true;
    }
    for (const [df, dr] of KING_STEPS) {
      const p = at(f + df, r + dr);
      if (p && p.c === by && p.t === 'k') return true;
    }
    for (const [dirs, sliders] of [[DIAGONALS, 'bq'], [STRAIGHTS, 'rq']]) {
      for (const [df, dr] of dirs) {
        let ff = f + df;
        let rr = r + dr;
        while (onBoard(ff, rr)) {
          const p = board[idx(ff, rr)];
          if (p) {
            if (p.c === by && sliders.includes(p.t)) return true;
            break;
          }
          ff += df;
          rr += dr;
        }
      }
    }
    return false;
  }

  function findKing(board, color) {
    for (let i = 0; i < 64; i++) {
      const p = board[i];
      if (p && p.c === color && p.t === 'k') return [i % 8, Math.floor(i / 8)];
    }
    return null;
  }

  function inCheck(state, color) {
    const k = findKing(state.board, color);
    return !!k && isAttacked(state.board, k[0], k[1], opponent(color));
  }

  // Every move the side to move could make, ignoring whether it leaves its own king in check
  function generatePseudo(state) {
    const { board, turn, castling, ep } = state;
    const moves = [];

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[idx(f, r)];
        if (!piece || piece.c !== turn) continue;

        const from = sqName(f, r);
        const add = (tf, tr, extra) => {
          const target = board[idx(tf, tr)];
          moves.push(Object.assign(
            { from, to: sqName(tf, tr), p: piece.t, c: turn, cap: target ? target.t : null },
            extra || {}
          ));
        };
        const friendlyAt = (tf, tr) => {
          const t = board[idx(tf, tr)];
          return !!t && t.c === turn;
        };

        if (piece.t === 'p') {
          const dir = turn === 'w' ? 1 : -1;
          const homeRank = turn === 'w' ? 1 : 6;
          const lastRank = turn === 'w' ? 7 : 0;
          const addPawn = (tf, tr, extra) => {
            if (tr === lastRank) {
              ['q', 'r', 'b', 'n'].forEach((pr) => add(tf, tr, Object.assign({ promo: pr }, extra)));
            } else {
              add(tf, tr, extra);
            }
          };
          // Pushes
          if (onBoard(f, r + dir) && !board[idx(f, r + dir)]) {
            addPawn(f, r + dir);
            if (r === homeRank && !board[idx(f, r + 2 * dir)]) add(f, r + 2 * dir, { double: true });
          }
          // Captures, including en passant
          for (const df of [-1, 1]) {
            const tf = f + df;
            const tr = r + dir;
            if (!onBoard(tf, tr)) continue;
            const target = board[idx(tf, tr)];
            if (target && target.c !== turn) {
              addPawn(tf, tr);
            } else if (!target && ep === sqName(tf, tr)) {
              addPawn(tf, tr, { ep: true, cap: 'p' });
            }
          }
        } else if (piece.t === 'n') {
          for (const [df, dr] of KNIGHT_STEPS) {
            if (onBoard(f + df, r + dr) && !friendlyAt(f + df, r + dr)) add(f + df, r + dr);
          }
        } else if (piece.t === 'k') {
          for (const [df, dr] of KING_STEPS) {
            if (onBoard(f + df, r + dr) && !friendlyAt(f + df, r + dr)) add(f + df, r + dr);
          }
          // Castling: king and rook unmoved, squares between empty, king not passing through check
          const home = turn === 'w' ? 0 : 7;
          const enemy = opponent(turn);
          const rookAt = (ff) => {
            const t = board[idx(ff, home)];
            return !!t && t.t === 'r' && t.c === turn;
          };
          if (f === 4 && r === home && !isAttacked(board, 4, home, enemy)) {
            const ks = turn === 'w' ? 'K' : 'k';
            const qs = turn === 'w' ? 'Q' : 'q';
            if (castling.includes(ks) && rookAt(7) && !board[idx(5, home)] && !board[idx(6, home)] &&
                !isAttacked(board, 5, home, enemy) && !isAttacked(board, 6, home, enemy)) {
              add(6, home, { castle: 'K' });
            }
            if (castling.includes(qs) && rookAt(0) && !board[idx(1, home)] && !board[idx(2, home)] &&
                !board[idx(3, home)] && !isAttacked(board, 3, home, enemy) && !isAttacked(board, 2, home, enemy)) {
              add(2, home, { castle: 'Q' });
            }
          }
        } else {
          // Sliding pieces: bishop, rook, queen
          const dirs = piece.t === 'b' ? DIAGONALS
            : piece.t === 'r' ? STRAIGHTS
            : DIAGONALS.concat(STRAIGHTS);
          for (const [df, dr] of dirs) {
            let tf = f + df;
            let tr = r + dr;
            while (onBoard(tf, tr)) {
              if (friendlyAt(tf, tr)) break;
              add(tf, tr);
              if (board[idx(tf, tr)]) break;
              tf += df;
              tr += dr;
            }
          }
        }
      }
    }
    return moves;
  }

  // Apply a move and return a new state (the old state is not changed)
  function makeMove(state, m) {
    const board = state.board.slice();
    const [ff, fr] = parseSq(m.from);
    const [tf, tr] = parseSq(m.to);
    let piece = board[idx(ff, fr)];
    board[idx(ff, fr)] = null;

    if (m.ep) board[idx(tf, fr)] = null; // the captured pawn sits beside the origin square
    if (m.castle === 'K') {
      board[idx(5, fr)] = board[idx(7, fr)];
      board[idx(7, fr)] = null;
    } else if (m.castle === 'Q') {
      board[idx(3, fr)] = board[idx(0, fr)];
      board[idx(0, fr)] = null;
    }
    if (m.promo) piece = { t: m.promo, c: m.c };
    board[idx(tf, tr)] = piece;

    let castling = state.castling;
    for (const sq of [m.from, m.to]) {
      for (const ch of (REVOKE[sq] || '')) castling = castling.split(ch).join('');
    }

    return {
      board,
      turn: opponent(m.c),
      castling,
      ep: m.p === 'p' && Math.abs(tr - fr) === 2 ? sqName(ff, (fr + tr) / 2) : null,
      halfmove: m.p === 'p' || m.cap ? 0 : state.halfmove + 1,
      fullmove: m.c === 'b' ? state.fullmove + 1 : state.fullmove,
    };
  }

  function anyLegal(state) {
    return generatePseudo(state).some((m) => !inCheck(makeMove(state, m), state.turn));
  }

  // Standard algebraic notation for one move, with disambiguation (e.g. Nbd2)
  function baseSan(m, legal) {
    if (m.castle) return m.castle === 'K' ? 'O-O' : 'O-O-O';
    if (m.p === 'p') {
      const promo = m.promo ? '=' + m.promo.toUpperCase() : '';
      return (m.cap ? m.from[0] + 'x' : '') + m.to + promo;
    }
    const rivals = legal.filter((o) => o.p === m.p && o.to === m.to && o.from !== m.from);
    let dis = '';
    if (rivals.length) {
      if (!rivals.some((o) => o.from[0] === m.from[0])) dis = m.from[0];
      else if (!rivals.some((o) => o.from[1] === m.from[1])) dis = m.from[1];
      else dis = m.from;
    }
    return m.p.toUpperCase() + dis + (m.cap ? 'x' : '') + m.to;
  }

  // Legal moves for the side to move. With withSan, each move gets a .san field.
  function legalMoves(state, withSan) {
    const legal = generatePseudo(state).filter((m) => !inCheck(makeMove(state, m), state.turn));
    if (withSan !== false) {
      for (const m of legal) {
        let san = baseSan(m, legal);
        const next = makeMove(state, m);
        if (inCheck(next, next.turn)) san += anyLegal(next) ? '+' : '#';
        m.san = san;
      }
    }
    return legal;
  }

  // Strip check marks, captures and zeros so "0-0", "Nxf3+" and "Nf3" compare equal
  function normalizeSan(s) {
    return s.replace(/[+#!?]/g, '').replace(/x/g, '').replace(/0-0-0/g, 'O-O-O').replace(/0-0/g, 'O-O');
  }

  function findMove(state, san) {
    const want = normalizeSan(san);
    return legalMoves(state).find((m) => normalizeSan(m.san) === want) || null;
  }

  // Squares a piece on (f, r) attacks, including the first blocker on each ray
  function attackedSquares(board, f, r) {
    const p = board[idx(f, r)];
    if (!p) return [];
    const out = [];
    const add = (ff, rr) => { if (onBoard(ff, rr)) out.push([ff, rr]); };
    if (p.t === 'p') {
      const dr = p.c === 'w' ? 1 : -1;
      add(f - 1, r + dr);
      add(f + 1, r + dr);
    } else if (p.t === 'n') {
      KNIGHT_STEPS.forEach(([df, dr]) => add(f + df, r + dr));
    } else if (p.t === 'k') {
      KING_STEPS.forEach(([df, dr]) => add(f + df, r + dr));
    } else {
      const dirs = p.t === 'b' ? DIAGONALS : p.t === 'r' ? STRAIGHTS : DIAGONALS.concat(STRAIGHTS);
      for (const [df, dr] of dirs) {
        let ff = f + df;
        let rr = r + dr;
        while (onBoard(ff, rr)) {
          out.push([ff, rr]);
          if (board[idx(ff, rr)]) break;
          ff += df;
          rr += dr;
        }
      }
    }
    return out;
  }

  function gameStatus(state) {
    const check = inCheck(state, state.turn);
    const hasMove = anyLegal(state);
    return { check, checkmate: check && !hasMove, stalemate: !check && !hasMove };
  }

  // White's material minus Black's, in pawn units (positive = White ahead)
  function materialBalance(board) {
    let total = 0;
    for (const cell of board) {
      if (!cell) continue;
      total += cell.c === 'w' ? PIECE_VALUES[cell.t] : -PIECE_VALUES[cell.t];
    }
    return total;
  }

  // Plain-English account of what a move does, and what it leaves behind
  function explainMove(state, m) {
    const after = makeMove(state, m);
    const enemy = opponent(m.c);
    const who = m.c === 'w' ? 'White' : 'Black';
    const [tf, tr] = parseSq(m.to);
    const lines = [];

    if (m.castle) {
      lines.push(`${who} castles ${m.castle === 'K' ? 'kingside' : 'queenside'}: the king gets to safety and the rook joins the game.`);
    } else {
      lines.push(`${who} moves the ${PIECE_NAMES[m.p]} from ${m.from} to ${m.to}.`);
      if (m.cap) {
        const what = m.ep ? 'pawn (en passant)' : PIECE_NAMES[m.cap];
        const v = PIECE_VALUES[m.cap];
        lines.push(`It captures the enemy ${what}, worth ${v} ${v === 1 ? 'point' : 'points'}.`);
      }
      if (m.promo) lines.push(`The pawn promotes to a ${PIECE_NAMES[m.promo]}.`);

      const homeRank = m.c === 'w' ? 0 : 7;
      if ((m.p === 'n' || m.p === 'b') && parseSq(m.from)[1] === homeRank) {
        lines.push('It develops a minor piece off the back rank, a core opening goal.');
      }
      if (m.p === 'q' && state.fullmove <= 4) {
        lines.push('Early queen moves can waste time: a minor piece can attack the queen and gain a tempo.');
      }
      if (m.p === 'p' && !m.cap && (m.from[0] === 'd' || m.from[0] === 'e')) {
        lines.push('A central pawn push gains space and opens lines for your bishop and queen.');
      }
      if (m.p === 'k') {
        lines.push('A king move is usually a weakness in the opening. Castling is normally better.');
      }
      if (CENTRE.includes(m.to) && m.p !== 'k') {
        lines.push(`It lands on ${m.to}, a central square that controls the middle of the board.`);
      }
    }

    if (inCheck(after, enemy)) {
      lines.push(anyLegal(after) ? 'It gives check: the opponent must respond.' : 'It is CHECKMATE: the game is over.');
    } else if (!anyLegal(after)) {
      lines.push('It is stalemate: the game is a draw.');
    }

    // What the moved piece now attacks
    const hits = attackedSquares(after.board, tf, tr)
      .filter(([f, r]) => { const t = after.board[idx(f, r)]; return t && t.c === enemy; })
      .map(([f, r]) => `${PIECE_NAMES[after.board[idx(f, r)].t]} on ${sqName(f, r)}`);
    if (hits.length) lines.push(`From ${m.to} it now attacks: ${hits.join(', ')}.`);

    // Is the moved piece safe on its new square?
    if (isAttacked(after.board, tf, tr, enemy)) {
      if (isAttacked(after.board, tf, tr, m.c)) {
        lines.push('The square is attacked by the enemy but defended by your pieces, so a capture leads to an exchange. Count the values before trading.');
      } else {
        lines.push(`Warning: the ${PIECE_NAMES[m.p]} on ${m.to} is attacked and NOT defended, so it can be captured for free.`);
      }
    }

    // Did this move leave any of your pieces hanging?
    const hanging = [];
    after.board.forEach((cell, i) => {
      if (!cell || cell.c !== m.c || cell.t === 'k') return;
      const f = i % 8;
      const r = Math.floor(i / 8);
      if (isAttacked(after.board, f, r, enemy) && !isAttacked(after.board, f, r, m.c)) {
        hanging.push(`${PIECE_NAMES[cell.t]} on ${sqName(f, r)}`);
      }
    });
    if (hanging.length) lines.push(`Your ${hanging.join(' and your ')} can now be captured with nothing defending it.`);

    return lines;
  }

  const api = {
    START_FEN,
    PIECE_NAMES,
    PIECE_VALUES,
    fromFen,
    startState: () => fromFen(START_FEN),
    findKing,
    inCheck,
    isAttacked,
    legalMoves,
    makeMove,
    findMove,
    normalizeSan,
    attackedSquares,
    gameStatus,
    materialBalance,
    explainMove,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.ChessEngine = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
