/*
 * Opening library. Each line is the book (main-line) sequence of moves, in
 * standard algebraic notation (SAN), starting from the normal start position.
 *
 *   side    : the colour the learner plays ('w' or 'b')
 *   moves   : every move of the line, both colours, in order.
 *             Odd positions (index 0, 2, 4...) are White's moves.
 *   note    : why the move is played, in plain English.
 *
 * Every line is checked by the test suite (tests/chess.test.js), so an
 * illegal move here will fail the tests.
 */
(function (root) {
  'use strict';

  const OPENINGS = [
    {
      id: 'italian',
      name: 'Italian Game',
      side: 'w',
      level: 'Beginner',
      summary: 'Classic open play. Develop quickly, aim the bishop at f7 and castle early.',
      moves: [
        { san: 'e4', note: 'Takes the centre and opens a diagonal for your bishop and queen.' },
        { san: 'e5', note: 'Black mirrors the idea and contests the centre.' },
        { san: 'Nf3', note: 'Develops a knight and attacks the e5 pawn.' },
        { san: 'Nc6', note: 'Defends e5 and develops a knight with a purpose.' },
        { san: 'Bc4', note: 'The bishop eyes f7, the weak square next to the black king.' },
        { san: 'Bc5', note: 'Black develops the bishop to the same kind of active diagonal.' },
        { san: 'c3', note: 'Prepares d4 to build a big centre.' },
        { san: 'Nf6', note: 'Attacks e4 and prepares to castle.' },
        { san: 'd3', note: 'Solid support for e4 and keeps the centre closed.' },
        { san: 'd6', note: 'Solid pawn support for e5.' },
        { san: 'O-O', note: 'Castles: the king is safer and the rook joins the game.' },
        { san: 'O-O', note: 'Black castles too, so both kings are safe.' },
      ],
    },
    {
      id: 'ruy-lopez',
      name: 'Ruy Lopez (Spanish)',
      side: 'w',
      level: 'Intermediate',
      summary: 'Pins the knight that defends e5 and builds long-term pressure.',
      moves: [
        { san: 'e4', note: 'Takes the centre and opens lines.' },
        { san: 'e5', note: 'Contests the centre.' },
        { san: 'Nf3', note: 'Attacks e5 with a developing move.' },
        { san: 'Nc6', note: 'Defends e5 and develops.' },
        { san: 'Bb5', note: 'Pressures the knight on c6, which defends e5.' },
        { san: 'a6', note: 'Asks the bishop: retreat, or give it up for the knight.' },
        { san: 'Ba4', note: 'Keeps the pressure on, staying on the diagonal.' },
        { san: 'Nf6', note: 'Develops and attacks e4.' },
        { san: 'O-O', note: 'Castles to bring the rook towards the centre.' },
        { san: 'Be7', note: 'Prepares castling and keeps the position solid.' },
        { san: 'Re1', note: 'Places the rook behind the e-pawn for future pressure.' },
        { san: 'b5', note: 'Gains queenside space; it weakens c5 and c6 slightly.' },
        { san: 'Bb3', note: 'Keeps the bishop on the long diagonal.' },
        { san: 'd6', note: 'Supports the e5 pawn.' },
        { san: 'c3', note: 'Prepares d4 for the centre.' },
        { san: 'O-O', note: 'Black castles and both sides are settled.' },
      ],
    },
    {
      id: 'london',
      name: 'London System',
      side: 'w',
      level: 'Beginner',
      summary: 'A sturdy setup: the bishop comes out early to f4 and the pawns form a solid wall.',
      moves: [
        { san: 'd4', note: 'Takes the centre with a pawn.' },
        { san: 'd5', note: 'Black takes the centre back.' },
        { san: 'Bf4', note: 'Develops the bishop before e3 blocks it: the key idea of the London.' },
        { san: 'Nf6', note: 'Develops a knight and controls e4.' },
        { san: 'e3', note: 'Opens the f1 bishop and supports the centre.' },
        { san: 'e6', note: 'Solid: prepares ...c5 or ...Bd6.' },
        { san: 'Nf3', note: 'Develops the knight and supports the centre.' },
        { san: 'c5', note: 'Black challenges d4.' },
        { san: 'c3', note: 'Supports d4 and prepares Nbd2.' },
        { san: 'Nc6', note: 'Develops a knight and pressures d4.' },
        { san: 'Nbd2', note: 'Develops the knight without blocking the c-pawn.' },
        { san: 'Bd6', note: 'Develops the bishop and eyes the h2 square.' },
        { san: 'Bg3', note: 'Keeps the bishop active on the diagonal.' },
        { san: 'O-O', note: 'Black castles.' },
        { san: 'Bd3', note: 'The bishop supports e4 and the centre.' },
      ],
    },
    {
      id: 'qgd',
      name: "Queen's Gambit Declined",
      side: 'b',
      level: 'Intermediate',
      summary: 'Black defends the d5 pawn solidly and aims for a strong centre and clear plans.',
      moves: [
        { san: 'd4', note: 'White takes the centre.' },
        { san: 'd5', note: 'Black mirrors and contests the centre.' },
        { san: 'c4', note: 'The Queen\'s Gambit: White attacks d5 to win the centre.' },
        { san: 'e6', note: 'Declines the gambit by defending d5 with a solid pawn.' },
        { san: 'Nc3', note: 'White develops and defends d4.' },
        { san: 'Nf6', note: 'Black develops and controls e4.' },
        { san: 'Bg5', note: 'White pins the knight, pressuring the centre.' },
        { san: 'Be7', note: 'Breaks the pin and prepares to castle.' },
        { san: 'e3', note: 'Solid centre for White.' },
        { san: 'O-O', note: 'Black castles for king safety.' },
        { san: 'Nf3', note: 'White develops.' },
        { san: 'h6', note: 'Asks the bishop: retreat, or trade it for the knight.' },
        { san: 'Bh4', note: 'White keeps the pressure with a retreat.' },
        { san: 'b6', note: 'Prepares the bishop to the long diagonal.' },
      ],
    },
    {
      id: 'caro-kann',
      name: 'Caro-Kann Defence',
      side: 'b',
      level: 'Beginner',
      summary: 'A rock-solid answer to 1.e4. Black prepares ...d5 with pawn support.',
      moves: [
        { san: 'e4', note: 'White takes the centre.' },
        { san: 'c6', note: 'Prepares ...d5 with pawn support, so the d5 pawn is not weak.' },
        { san: 'd4', note: 'White builds a broad centre.' },
        { san: 'd5', note: 'Black takes the centre with a protected pawn.' },
        { san: 'Nc3', note: 'White develops and defends the centre.' },
        { san: 'dxe4', note: 'Black captures and opens the d-file.' },
        { san: 'Nxe4', note: 'White recaptures with a knight in the centre.' },
        { san: 'Bf5', note: 'Black develops the bishop outside the pawn chain.' },
        { san: 'Ng3', note: 'White attacks the bishop to gain tempo.' },
        { san: 'Bg6', note: 'Black keeps the bishop safe and active.' },
        { san: 'h4', note: 'White starts a kingside pawn push.' },
        { san: 'h6', note: 'Black stops the push and protects g5.' },
        { san: 'Nf3', note: 'White develops the knight.' },
        { san: 'Nd7', note: 'Black develops and prepares to defend the centre.' },
        { san: 'h5', note: 'White keeps the pawn push going.' },
        { san: 'Bh7', note: 'Black retreats the bishop, keeping it alive.' },
        { san: 'Bd3', note: 'White develops and offers a bishop trade.' },
        { san: 'Bxd3', note: 'Black trades to reduce White\'s attacking chances.' },
        { san: 'Qxd3', note: 'White recaptures and brings the queen to the centre.' },
        { san: 'e6', note: 'Black completes the pawn structure and opens the bishop on h7.' },
      ],
    },
    {
      id: 'najdorf',
      name: 'Sicilian Najdorf (opening)',
      side: 'b',
      level: 'Advanced',
      summary: 'Black fights for the centre from the side with ...c5 and gains an active position.',
      moves: [
        { san: 'e4', note: 'White takes the centre.' },
        { san: 'c5', note: 'The Sicilian: Black fights for the centre off the centre.' },
        { san: 'Nf3', note: 'White develops and prepares d4.' },
        { san: 'd6', note: 'Prepares ...Nf6 and keeps the c5 pawn supported.' },
        { san: 'd4', note: 'White strikes the centre.' },
        { san: 'cxd4', note: 'Black trades a central pawn to open the position.' },
        { san: 'Nxd4', note: 'White recaptures with a knight that centralises.' },
        { san: 'Nf6', note: 'Black attacks e4.' },
        { san: 'Nc3', note: 'White defends e4.' },
        { san: 'a6', note: 'The Najdorf idea: stops Nb5 and prepares ...e5 or ...b5.' },
      ],
    },
  ];

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = OPENINGS;
  } else {
    root.OPENINGS = OPENINGS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
