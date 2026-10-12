# Chess Openings Trainer

A small web app that teaches chess openings. It shows the main-line moves,
explains why each move is played, and explains what any piece does when you
move it: what it captures, what it attacks, and whether it is left hanging.

It has a dashboard that tracks your progress, and a free board for trying
any moves you like.

No installs are needed. It is plain HTML, CSS and JavaScript, and it runs in
any modern browser.

## Run it

1. Open a terminal in this folder:

   ```bash
   cd projects/chess-openings
   ```

2. Either double-click `index.html`, or run a tiny local server (recommended,
   so everything loads the same way every time):

   ```bash
   python3 -m http.server 8000
   ```

   Then open <http://localhost:8000> in your browser. Stop the server with
   `Ctrl+C`.

## Test it

The rules engine and every opening line are checked by a test file. It uses
Node.js (version 18 or newer), which has the test runner built in. Nothing needs
to be installed.

```bash
cd projects/chess-openings
node --test tests/chess.test.js
```

A passing run ends with `# fail 0`. The tests cover:

- Move counts for three standard test positions ("perft" tests), which catch
  almost any mistake in move generation.
- Castling, en passant, promotion, check and checkmate notation.
- Every opening line in the library, to confirm each move is legal.
- The plain-English explanations of moves.

## How to use it

| Screen | What you do |
| --- | --- |
| **Dashboard** | See your progress, pick an opening, and read the piece guide. |
| **Learn** | Press **Next book move** to step through the line. Each move is explained and its reason is given. |
| **Practice** | You play your own colour and must find the book move. A wrong move is refused, and the page explains the book move and what your move would have done. The opponent's moves play automatically. Press **Show book move** for a hint. |
| **Free board** | Play any legal moves for both colours. Every move gets an explanation. |

Click a piece, then click the square you want it to go to. Promotion always
chooses a queen. Use **Undo** to take back the last move (in practice mode it
also takes back the opponent's reply).

Your progress (openings completed, book moves found, mistakes) is saved in
this browser only. If your browser blocks storage, the trainer still works, but
progress is not kept.

## Files

```
projects/chess-openings/
├── index.html          the page (dashboard and board)
├── css/style.css       colours and layout (colours are set in :root at the top)
├── js/chess.js         the rules engine and move explanations
├── js/openings.js      the opening library (moves and notes)
├── js/app.js           the screens, buttons and progress tracking
└── tests/chess.test.js the tests
```

## Adding or changing an opening

Open `js/openings.js` and add an entry to the `OPENINGS` list:

```js
{
  id: 'my-opening',          // unique, no spaces
  name: 'My Opening',
  side: 'w',                 // the colour you play: 'w' or 'b'
  level: 'Beginner',
  summary: 'One line about the idea of the opening.',
  moves: [
    { san: 'e4', note: 'Why this move is played.' },
    { san: 'e5', note: 'Why Black replies this way.' },
    // ... every move of the line, White and Black in order
  ],
},
```

Write moves in standard notation (`e4`, `Nf3`, `O-O`, `exd5`, `Qh4#`).
Then run the tests. If a move is illegal, the test names the opening and the
move.

## Limits

- The app does not run a chess engine. Explanations come from the rules
  (what a piece attacks, whether it is defended), not from deep calculation.
  For strength analysis, use a chess site or a Stockfish notebook.
- Only one opening line is stored per opening. Sidelines are not included yet.
- Clicking is the only way to move (no drag and drop), and promotion is always a queen.
