/*
 * App logic for the Chess Openings Trainer.
 *
 * Modes for an opening:
 *   learn    : the "Next book move" button plays the book move and explains it.
 *   practice : you play your own colour and must find the book move. Wrong
 *              moves are refused and explained. The opponent plays automatically.
 *   free     : any legal move for either colour, with an explanation each time.
 *
 * Progress is saved in this browser's localStorage. If storage is blocked,
 * the trainer still works and the progress is simply not kept.
 */
(function () {
  'use strict';

  const E = window.ChessEngine;
  const OPENINGS = window.OPENINGS;
  const STORE_KEY = 'chess-openings-v1';
  const OPPONENT_DELAY_MS = 600;
  const SIDE_NAME = { w: 'White', b: 'Black' };
  const GLYPHS = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
  };
  const FILE_LETTERS = 'abcdefgh';

  const PIECE_GUIDE = [
    { name: 'King', moves: 'One square in any direction.', why: 'Losing the king ends the game, so keep it safe. Castle early to tuck it away.' },
    { name: 'Queen', moves: 'Any distance along ranks, files and diagonals.', why: 'Very powerful, but an early queen move can be chased by minor pieces and lose time.' },
    { name: 'Rook', moves: 'Any distance along ranks and files (not diagonal).', why: 'Rooks want open files. They join the game after you castle and the centre opens.' },
    { name: 'Bishop', moves: 'Any distance along diagonals. It stays on its colour.', why: 'Develop early to open long diagonals, usually before pawns block them.' },
    { name: 'Knight', moves: 'An L-shape: two squares one way, one square across. It can jump.', why: 'Best on central squares. A knight on the edge (a- or h-file) has few options.' },
    { name: 'Pawn', moves: 'One square forward (two from its start). It captures diagonally forward.', why: 'Pawns claim the centre and open lines. A pawn push cannot be undone, so think first.' },
  ];

  const PRINCIPLES = [
    'Control the centre (d4, d5, e4, e5).',
    'Develop knights and bishops before moving the queen or rooks.',
    'Castle early to protect your king and connect the rooks.',
    'Do not move the same piece twice without a good reason.',
    'Before every move, check whether the piece you move, or any other piece, is left undefended.',
  ];

  const $ = (id) => document.getElementById(id);

  // ---- Saved progress -------------------------------------------------------

  function loadStore() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY));
      return data && typeof data === 'object' ? data : { openings: {} };
    } catch (err) {
      return { openings: {} }; // storage blocked or corrupt: start fresh
    }
  }

  function saveStore() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (err) {
      // Not fatal: progress just is not kept between visits
    }
  }

  let store = loadStore();
  store.openings = store.openings || {};

  function statFor(id) {
    if (!store.openings[id]) {
      store.openings[id] = { attempts: 0, correct: 0, wrong: 0, bestPly: 0, learned: false };
    }
    return store.openings[id];
  }

  // ---- Session --------------------------------------------------------------

  let session = null;
  let timer = null;

  function createSession(opening, mode) {
    clearTimeout(timer);
    const state = E.startState();
    session = {
      opening,                        // null for free play
      mode,                           // 'learn' | 'practice' | 'free'
      state,
      legal: E.legalMoves(state),
      ply: 0,                         // how many book moves have been played
      deviated: false,                // true once a move leaves the book
      history: [],                    // snapshots for Undo
      log: [],                        // every move played, with its explanation
      last: null,                     // [from, to] of the last move, for highlighting
      selected: null,
      message: null,
      feedback: null,                 // explanation of a refused move
    };
    if (opening) {
      // Practice starts on the opponent's move if the learner plays Black
      scheduleOpponent();
    }
  }

  function startStudy(opening, mode) {
    if (opening) statFor(opening.id).attempts++;
    createSession(opening, mode);
    saveStore();
    showView('study');
    syncModeSelect();
    render();
  }

  // The book move for the current position, or null if the line is over or was left
  function bookEntry() {
    const op = session.opening;
    if (!op || session.deviated || session.ply >= op.moves.length) return null;
    return op.moves[session.ply];
  }

  // Can the person click to move now?
  function canUserMove() {
    if (session.mode === 'free' || !session.opening) return true;
    return session.state.turn === session.opening.side;
  }

  function refreshLegal() {
    session.legal = E.legalMoves(session.state);
  }

  function gameMessage() {
    const status = E.gameStatus(session.state);
    const turn = session.state.turn;
    if (status.checkmate) return `Checkmate. ${SIDE_NAME[turn === 'w' ? 'b' : 'w']} wins.`;
    if (status.stalemate) return 'Stalemate. The game is a draw.';
    if (status.check) return `${SIDE_NAME[turn]} is in check.`;
    return `${SIDE_NAME[turn]} to move.`;
  }

  // Play a move on the board and record its explanation.
  // note = book explanation for a book move, or null for a free move.
  function playMove(m, note) {
    const before = session.state;
    const op = session.opening;
    session.history.push({
      state: before,
      ply: session.ply,
      deviated: session.deviated,
      mode: session.mode,
      last: session.last,
      logLength: session.log.length,
    });

    session.log.push({
      no: before.fullmove,
      side: m.c,
      san: m.san,
      lines: E.explainMove(before, m),
      note: note,
    });

    if (note !== null) session.ply++;
    session.state = E.makeMove(before, m);
    session.last = [m.from, m.to];
    session.selected = null;
    session.feedback = null;
    session.message = null;
    refreshLegal();

    if (op) {
      const st = statFor(op.id);
      st.bestPly = Math.max(st.bestPly, session.ply);
      if (session.ply >= op.moves.length && !session.deviated) {
        if (session.mode === 'practice') st.learned = true;
        session.mode = 'free';
        session.message = `Book line finished. You can keep playing freely.`;
        syncModeSelect();
      }
    }
    saveStore();
    scheduleOpponent();
    render();
  }

  // The user clicked a legal move
  function onUserMove(m) {
    const op = session.opening;
    const entry = bookEntry();

    if (entry) {
      const book = E.findMove(session.state, entry.san);
      if (book && book.from === m.from && book.to === m.to) {
        if (op && session.state.turn === op.side) statFor(op.id).correct++;
        playMove(m, entry.note);
        return;
      }
      if (session.mode === 'practice') {
        statFor(op.id).wrong++;
        saveStore();
        session.feedback = {
          title: `Not the book move. The book plays ${book.san}.`,
          lines: [entry.note, `Your ${m.san} would do this: ${E.explainMove(session.state, m).join(' ')}`],
        };
        session.selected = null;
        render();
        return;
      }
      // Learn mode: the learner leaves the book
      session.deviated = true;
      session.mode = 'free';
      syncModeSelect();
      playMove(m, null);
      session.message = `You left the book. The book plays ${book.san} here: ${entry.note}`;
      render();
      return;
    }

    playMove(m, null);
  }

  // Schedule the opponent's book reply in practice mode
  function scheduleOpponent() {
    clearTimeout(timer);
    const entry = bookEntry();
    if (session && session.mode === 'practice' && entry && session.state.turn !== session.opening.side) {
      timer = setTimeout(playBook, OPPONENT_DELAY_MS);
    }
  }

  // Play the next book move (either colour)
  function playBook() {
    const entry = bookEntry();
    if (!entry) {
      session.message = 'The book line ends here. Free play from now on.';
      render();
      return;
    }
    const m = E.findMove(session.state, entry.san);
    if (!m) {
      session.deviated = true; // should never happen: the tests check every line
      session.message = `Book move ${entry.san} could not be played here.`;
      render();
      return;
    }
    playMove(m, entry.note);
  }

  function undo() {
    clearTimeout(timer);
    let snap = session.history.pop();
    // In practice mode, undo the opponent's automatic reply as well
    while (snap && session.opening && session.mode === 'practice' &&
           snap.state.turn !== session.opening.side && session.history.length) {
      snap = session.history.pop();
    }
    if (!snap) return;
    session.state = snap.state;
    session.ply = snap.ply;
    session.deviated = snap.deviated;
    session.mode = snap.mode;
    session.last = snap.last;
    session.log.length = snap.logLength;
    session.selected = null;
    session.feedback = null;
    session.message = null;
    refreshLegal();
    syncModeSelect();
    scheduleOpponent();
    render();
  }

  function restart() {
    createSession(session.opening, session.opening ? session.mode : 'free');
    syncModeSelect();
    render();
  }

  // ---- Board ----------------------------------------------------------------

  function sqIndex(name) {
    return (name.charCodeAt(0) - 97) + (Number(name[1]) - 1) * 8;
  }

  function onSquare(sq) {
    const s = session.state;
    if (session.selected) {
      const options = session.legal.filter((m) => m.from === session.selected && m.to === sq);
      if (options.length) {
        session.selected = null;
        onUserMove(options.find((m) => m.promo === 'q') || options[0]);
        return;
      }
    }
    const piece = s.board[sqIndex(sq)];
    session.selected = piece && piece.c === s.turn && canUserMove() ? sq : null;
    session.feedback = session.feedback && session.selected ? null : session.feedback;
    renderBoard();
  }

  function renderBoard() {
    const boardEl = $('board');
    boardEl.innerHTML = '';
    const s = session.state;
    const flip = session.opening && session.opening.side === 'b';
    const kingPos = E.inCheck(s, s.turn) ? E.findKing(s.board, s.turn) : null;
    const kingSq = kingPos ? FILE_LETTERS[kingPos[0]] + (kingPos[1] + 1) : null;

    for (let vr = 0; vr < 8; vr++) {
      const r = flip ? vr : 7 - vr;
      for (let vf = 0; vf < 8; vf++) {
        const f = flip ? 7 - vf : vf;
        const sq = FILE_LETTERS[f] + (r + 1);
        const piece = s.board[r * 8 + f];

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'sq ' + ((f + r) % 2 === 0 ? 'dark' : 'light');
        cell.dataset.sq = sq;
        cell.setAttribute('aria-label', piece ? `${SIDE_NAME[piece.c]} ${E.PIECE_NAMES[piece.t]} on ${sq}` : sq);

        if (session.last && session.last.includes(sq)) cell.classList.add('last');
        if (session.selected === sq) cell.classList.add('sel');
        if (kingSq === sq) cell.classList.add('check');
        if (session.selected && session.legal.some((m) => m.from === session.selected && m.to === sq)) {
          cell.classList.add(piece ? 'capture' : 'target');
        }
        if (piece) {
          const span = document.createElement('span');
          span.className = 'piece ' + piece.c;
          span.textContent = GLYPHS[piece.c][piece.t];
          cell.appendChild(span);
        }
        cell.addEventListener('click', () => onSquare(sq));
        boardEl.appendChild(cell);
      }
    }
  }

  // ---- Panels ---------------------------------------------------------------

  function renderMaterial() {
    const bal = E.materialBalance(session.state.board);
    let text = 'Material: equal';
    if (bal > 0) text = `Material: White +${bal}`;
    if (bal < 0) text = `Material: Black +${-bal}`;
    $('material').textContent = text + ' (pawn = 1, knight/bishop = 3, rook = 5, queen = 9)';
  }

  function renderStatus() {
    const box = $('status');
    const warn = !!session.feedback;
    box.className = 'status' + (warn ? ' warn' : '');
    const modeText = {
      learn: 'Learn mode: press Next book move to step through the line.',
      practice: 'Practice mode: play the book move yourself.',
      free: 'Free play: any legal move, for either colour.',
    }[session.mode];
    box.textContent = (session.feedback ? session.feedback.title : session.message || gameMessage()) +
      (session.opening ? '  ' + modeText : '');
  }

  function addLines(parent, lines, cls) {
    const ul = document.createElement('ul');
    lines.forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      if (cls && /warning|hanging|NOT defended|CHECKMATE|check/i.test(text)) li.className = cls;
      ul.appendChild(li);
    });
    parent.appendChild(ul);
  }

  function renderExplain() {
    const box = $('explain');
    box.innerHTML = '';
    if (session.feedback) {
      const head = document.createElement('p');
      head.className = 'head';
      head.textContent = 'Your move was not played.';
      box.appendChild(head);
      addLines(box, session.feedback.lines, 'warning');
      return;
    }
    const last = session.log[session.log.length - 1];
    if (!last) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = session.opening
        ? 'Press Next book move, or make a move, to see what it does and why.'
        : 'Make a move to see what the piece does and what it attacks.';
      box.appendChild(p);
      return;
    }
    const head = document.createElement('p');
    head.className = 'head';
    head.textContent = `${last.no}${last.side === 'w' ? '.' : '...'} ${last.san} (${SIDE_NAME[last.side]})`;
    box.appendChild(head);
    addLines(box, last.lines, 'warning');
    if (last.note) {
      const p = document.createElement('p');
      p.className = 'book';
      p.textContent = 'Why (book): ' + last.note;
      box.appendChild(p);
    }
  }

  function renderMoves() {
    const list = $('moves');
    list.innerHTML = '';
    session.log.forEach((entry) => {
      const li = document.createElement('li');
      li.textContent = `${entry.no}${entry.side === 'w' ? '.' : '...'} ${entry.san}`;
      if (entry.note !== null) {
        const mark = document.createElement('span');
        mark.className = 'book-mark';
        mark.textContent = ' · book';
        li.appendChild(mark);
      }
      list.appendChild(li);
    });
  }

  function syncModeSelect() {
    const select = $('mode');
    const options = session.opening
      ? [['learn', 'Learn (book)'], ['practice', 'Practice (you play the book)'], ['free', 'Free play']]
      : [['free', 'Free play']];
    select.innerHTML = '';
    options.forEach(([value, label]) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      select.appendChild(opt);
    });
    select.value = session.mode;
  }

  function render() {
    $('study-title').textContent = session.opening ? session.opening.name : 'Free board';
    $('study-summary').textContent = session.opening
      ? `${session.opening.summary} You play ${SIDE_NAME[session.opening.side]}.`
      : 'Play any moves. After each one you get an explanation of what the piece does and what it attacks.';
    const entry = bookEntry();
    $('next').textContent = session.mode === 'practice' ? 'Show book move' : 'Next book move';
    $('next').disabled = !entry;
    $('undo').disabled = session.history.length === 0;
    renderBoard();
    renderMaterial();
    renderStatus();
    renderExplain();
    renderMoves();
  }

  // ---- Dashboard ------------------------------------------------------------

  function renderDashboard() {
    const learned = OPENINGS.filter((o) => statFor(o.id).learned).length;
    let correct = 0;
    let wrong = 0;
    OPENINGS.forEach((o) => {
      correct += statFor(o.id).correct;
      wrong += statFor(o.id).wrong;
    });
    const tried = correct + wrong;
    const accuracy = tried ? Math.round((1000 * correct) / tried) / 10 + '%' : 'No moves yet';

    const stats = [
      { value: `${learned} / ${OPENINGS.length}`, label: 'Openings completed in practice' },
      { value: String(correct), label: 'Book moves found on your own' },
      { value: accuracy, label: 'Accuracy in practice' },
      { value: String(wrong), label: 'Moves to review' },
    ];
    const statsEl = $('stats');
    statsEl.innerHTML = '';
    stats.forEach((s) => {
      const div = document.createElement('div');
      div.className = 'stat';
      div.innerHTML = `<div class="value"></div><div class="label"></div>`;
      div.querySelector('.value').textContent = s.value;
      div.querySelector('.label').textContent = s.label;
      statsEl.appendChild(div);
    });

    const cards = $('cards');
    cards.innerHTML = '';
    OPENINGS.forEach((o) => {
      const st = statFor(o.id);
      const pct = Math.min(100, Math.round((100 * st.bestPly) / o.moves.length));
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <span class="tag"></span>
        <h3></h3>
        <p></p>
        <div class="bar"><span></span></div>
        <p class="progress"></p>
        <div class="actions">
          <button type="button" class="primary" data-act="practice">Practice</button>
          <button type="button" data-act="learn">Learn</button>
        </div>`;
      card.querySelector('.tag').textContent = `${o.level} · you play ${SIDE_NAME[o.side]}`;
      card.querySelector('h3').textContent = o.name;
      card.querySelector('p').textContent = o.summary;
      card.querySelector('.bar > span').style.width = pct + '%';
      card.querySelector('.progress').textContent = st.learned
        ? 'Completed in practice.'
        : `Best progress: ${st.bestPly} of ${o.moves.length} book moves.`;
      card.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => startStudy(o, btn.dataset.act));
      });
      cards.appendChild(card);
    });

    const guide = $('piece-guide');
    guide.innerHTML = '';
    PIECE_GUIDE.forEach((p) => {
      const card = document.createElement('article');
      card.className = 'card';
      const h = document.createElement('h3');
      h.textContent = p.name;
      const moves = document.createElement('p');
      moves.textContent = 'How it moves: ' + p.moves;
      const why = document.createElement('p');
      why.textContent = 'Why it matters: ' + p.why;
      why.style.color = 'var(--text)';
      card.append(h, moves, why);
      guide.appendChild(card);
    });

    const principles = $('principles');
    principles.innerHTML = '';
    PRINCIPLES.forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      principles.appendChild(li);
    });
  }

  // ---- Views and wiring -----------------------------------------------------

  function showView(name) {
    $('dashboard').classList.toggle('hidden', name !== 'dashboard');
    $('study').classList.toggle('hidden', name !== 'study');
    if (name === 'dashboard') renderDashboard();
  }

  $('nav-dashboard').addEventListener('click', () => showView('dashboard'));
  $('back').addEventListener('click', () => showView('dashboard'));
  $('nav-free').addEventListener('click', () => startStudy(null, 'free'));
  $('next').addEventListener('click', () => {
    if (session.mode === 'practice') {
      // Practice shows a hint without playing the move
      const entry = bookEntry();
      if (entry) {
        session.feedback = null;
        session.message = `Book move: ${entry.san}. ${entry.note}`;
        renderStatus();
      }
      return;
    }
    playBook();
  });
  $('undo').addEventListener('click', undo);
  $('restart').addEventListener('click', restart);
  $('mode').addEventListener('change', (e) => {
    clearTimeout(timer);
    session.mode = e.target.value;
    session.feedback = null;
    session.message = null;
    scheduleOpponent();
    render();
  });

  showView('dashboard');
})();
