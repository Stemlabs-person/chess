/* ---------- Navigation ---------- */
const tabButtons = document.querySelectorAll(".tab-btn");
const views = document.querySelectorAll(".view");

function showView(name) {
  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  views.forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
}

tabButtons.forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
document.querySelectorAll("[data-goto]").forEach((el) =>
  el.addEventListener("click", () => showView(el.dataset.goto))
);

/* ---------- Piece symbols ---------- */
const PIECE_UNICODE = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function squareId(file, rank) {
  return `${FILES[file]}${rank}`;
}

/* ---------- Generic Board Renderer ---------- */
class BoardUI {
  constructor(containerEl, game, opts = {}) {
    this.el = containerEl;
    this.game = game;
    this.orientation = opts.orientation || "white"; // 'white' or 'black'
    this.onUserMove = opts.onUserMove || (() => {});
    this.interactive = opts.interactive !== false;
    this.selected = null;
    this.lastMove = opts.lastMove || null;
    this.render();
  }

  setOrientation(o) { this.orientation = o; this.render(); }

  render() {
    this.el.innerHTML = "";
    this.selected = null;
    const ranks = this.orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    const files = this.orientation === "white" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

    const kingInCheckSquare = this.getKingInCheckSquare();

    ranks.forEach((rank) => {
      files.forEach((fileIdx) => {
        const sq = squareId(fileIdx, rank);
        const isLight = (fileIdx + rank) % 2 === 1;
        const div = document.createElement("div");
        div.className = `square ${isLight ? "light" : "dark"}`;
        div.dataset.square = sq;

        if (this.lastMove && (sq === this.lastMove.from || sq === this.lastMove.to)) {
          div.classList.add("last-move");
        }
        if (kingInCheckSquare && sq === kingInCheckSquare) {
          div.classList.add("in-check");
        }

        const piece = this.game.get(sq);
        if (piece) {
          const span = document.createElement("span");
          span.className = "piece";
          span.textContent = PIECE_UNICODE[piece.color + piece.type];
          div.appendChild(span);
        }

        if (this.interactive) {
          div.addEventListener("click", () => this.handleSquareClick(sq));
        }
        this.el.appendChild(div);
      });
    });
  }

  getKingInCheckSquare() {
    if (!this.game.in_check) return null;
    if (!this.game.in_check()) return null;
    const color = this.game.turn();
    const board = this.game.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p && p.type === "k" && p.color === color) {
          return squareId(f, 8 - r);
        }
      }
    }
    return null;
  }

  clearHighlights() {
    this.el.querySelectorAll(".square").forEach((s) => {
      s.classList.remove("selected", "move-target", "capture-target");
    });
  }

  handleSquareClick(sq) {
    if (this.selected) {
      if (this.selected === sq) {
        this.clearHighlights();
        this.selected = null;
        return;
      }
      const moves = this.game.moves({ square: this.selected, verbose: true });
      const match = moves.find((m) => m.to === sq);
      if (match) {
        this.attemptMove(this.selected, sq, match);
        return;
      }
      // reselect if clicking another own piece
      const piece = this.game.get(sq);
      if (piece && piece.color === this.game.turn()) {
        this.select(sq);
      } else {
        this.clearHighlights();
        this.selected = null;
      }
      return;
    }
    const piece = this.game.get(sq);
    if (piece && piece.color === this.game.turn()) {
      this.select(sq);
    }
  }

  select(sq) {
    this.clearHighlights();
    this.selected = sq;
    const el = this.el.querySelector(`[data-square="${sq}"]`);
    if (el) el.classList.add("selected");
    const moves = this.game.moves({ square: sq, verbose: true });
    moves.forEach((m) => {
      const target = this.el.querySelector(`[data-square="${m.to}"]`);
      if (!target) return;
      target.classList.add(m.flags.includes("c") || m.flags.includes("e") ? "capture-target" : "move-target");
    });
  }

  attemptMove(from, to, matchedMove) {
    let promotion;
    if (matchedMove.flags.includes("p")) promotion = "q"; // auto-promote to queen for simplicity
    const move = this.game.move({ from, to, promotion });
    this.clearHighlights();
    this.selected = null;
    if (move) {
      this.lastMove = { from, to };
      this.onUserMove(move);
    }
    this.render();
  }
}

/* ================= PLAY MODE ================= */
const playGame = new Chess();
let playBoard;
const playStatus = document.getElementById("play-status");
const movesListEl = document.getElementById("move-history");
const capWhiteEl = document.getElementById("cap-white");
const capBlackEl = document.getElementById("cap-black");

const CAPTURE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function updatePlayStatus() {
  let text = "";
  const turnName = playGame.turn() === "w" ? "White" : "Black";
  if (playGame.in_checkmate && playGame.in_checkmate()) {
    text = `Checkmate! ${turnName === "White" ? "Black" : "White"} wins 🎉`;
  } else if (playGame.in_draw && playGame.in_draw()) {
    text = "It's a draw!";
  } else if (playGame.in_check && playGame.in_check()) {
    text = `${turnName} is in check!`;
  } else {
    text = `${turnName}'s turn`;
  }
  playStatus.textContent = text;
}

function updateCaptured() {
  const captured = { w: [], b: [] };
  playGame.history({ verbose: true }).forEach((m) => {
    if (m.captured) {
      // piece captured belonged to the opponent of m.color
      const byColor = m.color === "w" ? "w" : "b";
      captured[byColor].push(m.captured);
    }
  });
  capWhiteEl.textContent = captured.w.map((p) => PIECE_UNICODE["b" + p]).join(" ");
  capBlackEl.textContent = captured.b.map((p) => PIECE_UNICODE["w" + p]).join(" ");
}

function updateMoveHistory() {
  movesListEl.innerHTML = "";
  const history = playGame.history();
  for (let i = 0; i < history.length; i += 2) {
    const li = document.createElement("li");
    li.textContent = `${history[i] || ""} ${history[i + 1] || ""}`;
    movesListEl.appendChild(li);
  }
}

function refreshPlayUI() {
  updatePlayStatus();
  updateCaptured();
  updateMoveHistory();
}

playBoard = new BoardUI(document.getElementById("play-board"), playGame, {
  onUserMove: refreshPlayUI,
});
refreshPlayUI();

document.getElementById("play-new").addEventListener("click", () => {
  playGame.reset();
  playBoard.lastMove = null;
  playBoard.render();
  refreshPlayUI();
});

document.getElementById("play-undo").addEventListener("click", () => {
  playGame.undo();
  playBoard.lastMove = null;
  playBoard.render();
  refreshPlayUI();
});

document.getElementById("play-flip").addEventListener("click", () => {
  playBoard.setOrientation(playBoard.orientation === "white" ? "black" : "white");
});

/* ================= PUZZLES MODE (endless, shuffled, streak) ================= */
const PUZZLES = [
  { d: "easy", title: "Free Lunch", desc: "White to move. Capture the undefended piece!", fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", solution: ["Nxe5"] },
  { d: "easy", title: "Fork!", desc: "White to move. Find the knight move that attacks two pieces at once.", fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", solution: ["Ng5"] },
  { d: "easy", title: "Checkmate in 1", desc: "White to move. Deliver checkmate!", fen: "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4", solution: [] },
  { d: "easy", title: "Back Rank", desc: "White to move. The black king has no escape squares — find mate in 1!", fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", solution: ["Ra8#"] },
  { d: "easy", title: "Sneaky Check", desc: "Black to move. Find the queen move that captures a pawn AND gives check!", fen: "rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R b KQkq - 2 3", solution: ["Qxf2+"] },
  { d: "easy", title: "Easy Mate", desc: "Black to move. One move checkmate!", fen: "6k1/8/8/8/8/8/6PP/q5K1 b - - 0 1", solution: ["Qe1#"] },
  { d: "easy", title: "Grab the Rook", desc: "White to move. Win the undefended rook!", fen: "4k3/8/8/8/8/3r4/3Q4/4K3 w - - 0 1", solution: ["Qxd3"] },
  { d: "easy", title: "Ladder Mate", desc: "White to move. Deliver checkmate with your rook!", fen: "k7/8/1KR5/8/8/8/8/8 w - - 0 1", solution: ["Rc8#"] },
  { d: "easy", title: "Pin and Win", desc: "White to move. Capture the pawn, it cannot be recaptured!", fen: "rnbqkbnr/ppp2ppp/8/3pp3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3", solution: ["exd5"] },
  { d: "easy", title: "Queen Check", desc: "White to move. Find the check that also attacks the rook.", fen: "4k2r/8/8/8/8/8/4Q3/4K3 w - - 0 1", solution: ["Qe7+"] },
  { d: "medium", title: "Center Grab", desc: "White to move. Win a free pawn in the center.", fen: "rnbqkb1r/pp3ppp/4pn2/2pp4/3P4/2N1PN2/PPP2PPP/R1BQKB1R w KQkq - 0 6", solution: ["dxc5"] },
  { d: "medium", title: "Smothered-ish", desc: "White to move. The knight move wins material.", fen: "r1bq1rk1/pppp1ppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7", solution: ["Nd5"] },
  { d: "medium", title: "Skewer", desc: "White to move. Line up the king and queen with a rook check!", fen: "3q2k1/8/8/8/8/8/8/R3K3 w - - 0 1", solution: ["Ra8"] },
  { d: "medium", title: "Trap the Queen", desc: "Black to move. Grab the free central pawn with check!", fen: "rnb1kbnr/ppp2ppp/8/3qp3/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq - 0 3", solution: ["Qxe4+"] },
  { d: "medium", title: "Mate in 2 Setup", desc: "White to move. Force checkmate next move!", fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1", solution: ["Re8#"] },
  { d: "medium", title: "Double Attack", desc: "White to move. One move, two threats!", fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 2 5", solution: ["Ng5"] },
  { d: "medium", title: "Clearance", desc: "White to move. Remove the blocker with check!", fen: "4k3/4r3/8/8/8/8/4R3/4K3 w - - 0 1", solution: ["Rxe7+"] },
  { d: "medium", title: "Open File Mate", desc: "White to move. Deliver checkmate down the open file!", fen: "3r2k1/5ppp/8/8/8/8/5PP1/3R2K1 w - - 0 1", solution: ["Rxd8#"] },
  { d: "medium", title: "Windmill Start", desc: "White to move. Win a pawn with tempo.", fen: "rnbqkb1r/pp3ppp/4pn2/2pp4/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 6", solution: ["cxd5"] },
  { d: "medium", title: "Knight Sacrifice Fork", desc: "White to move. Give up the knight to win the queen!", fen: "r2qkb1r/ppp2ppp/2n5/3np3/2B5/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 7", solution: ["Nxe5"] },
  { d: "hard", title: "Back Rank Squeeze", desc: "White to move. Find mate in 1 with the rook.", fen: "5rk1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1", solution: ["Re8"] },
  { d: "hard", title: "Overload", desc: "White to move. One piece is defending too much — take it all!", fen: "2r3k1/5ppp/8/8/8/8/2Q2PPP/2R3K1 w - - 0 1", solution: ["Qxc8#"] },
  { d: "hard", title: "Bishop Snipe", desc: "White to move. The bishop can grab a pawn with check!", fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 2 5", solution: ["Bxf7+"] },
  { d: "hard", title: "Queen Sac Mate", desc: "White to move. Sacrifice the queen for checkmate!", fen: "6k1/6pp/8/8/8/8/1Q3PPP/6K1 w - - 0 1", solution: ["Qb8+"] },
  { d: "hard", title: "Long Diagonal", desc: "White to move. The bishop rules the diagonal — find the winning shot.", fen: "r2q1rk1/pp3ppp/2p5/3np3/2B5/2N2Q2/PPP2PPP/R4RK1 w - - 0 12", solution: ["Bxd5"] },
];

const DIFF_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" };

let puzzleGame;
let puzzleBoard;
let currentDifficulty = "all";
let shuffleBag = [];
let currentPuzzle = null;
let streak = Number(localStorage.getItem("pp-streak") || 0);
let bestStreak = Number(localStorage.getItem("pp-best-streak") || 0);
let solvedCount = Number(localStorage.getItem("pp-solved-count") || 0);

const puzzleStatus = document.getElementById("puzzle-status");
const puzzleTitle = document.getElementById("puzzle-title");
const puzzleDesc = document.getElementById("puzzle-desc");
const puzzleDiffEl = document.getElementById("puzzle-diff");
const puzzleMessage = document.getElementById("puzzle-message");
const streakCountEl = document.getElementById("streak-count");
const streakBestEl = document.getElementById("streak-best");
const solvedCountEl = document.getElementById("solved-count");
const diffFilterEl = document.getElementById("diff-filter");

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pool() {
  return currentDifficulty === "all" ? PUZZLES : PUZZLES.filter((p) => p.d === currentDifficulty);
}

function nextFromBag() {
  if (shuffleBag.length === 0) shuffleBag = shuffle(pool());
  return shuffleBag.pop();
}

function updateStreakUI() {
  streakCountEl.textContent = streak;
  streakBestEl.textContent = bestStreak;
  solvedCountEl.textContent = solvedCount;
}

function saveStreak() {
  localStorage.setItem("pp-streak", streak);
  localStorage.setItem("pp-best-streak", bestStreak);
  localStorage.setItem("pp-solved-count", solvedCount);
}

diffFilterEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".diff-btn");
  if (!btn) return;
  currentDifficulty = btn.dataset.diff;
  diffFilterEl.querySelectorAll(".diff-btn").forEach((b) => b.classList.toggle("active", b === btn));
  shuffleBag = [];
  loadNextPuzzle();
});

function loadNextPuzzle() {
  currentPuzzle = nextFromBag();
  const p = currentPuzzle;
  puzzleGame = new Chess(p.fen);
  const orientation = puzzleGame.turn() === "w" ? "white" : "black";
  puzzleTitle.textContent = p.title;
  puzzleDesc.textContent = p.desc;
  puzzleDiffEl.textContent = DIFF_LABEL[p.d];
  puzzleDiffEl.className = `diff-pill diff-${p.d}`;
  puzzleMessage.textContent = "";
  puzzleMessage.className = "puzzle-message";
  puzzleStatus.textContent = puzzleGame.turn() === "w" ? "White to move" : "Black to move";

  if (!puzzleBoard) {
    puzzleBoard = new BoardUI(document.getElementById("puzzle-board"), puzzleGame, {
      orientation,
      onUserMove: handlePuzzleMove,
    });
  } else {
    puzzleBoard.game = puzzleGame;
    puzzleBoard.orientation = orientation;
    puzzleBoard.lastMove = null;
    puzzleBoard.render();
  }
}

function handlePuzzleMove(move) {
  const p = currentPuzzle;
  const sanMove = move.san;
  const expected = p.solution[0];
  const isMate = puzzleGame.in_checkmate && puzzleGame.in_checkmate();

  if ((expected && sanMove === expected) || (!expected && isMate)) {
    streak += 1;
    solvedCount += 1;
    if (streak > bestStreak) bestStreak = streak;
    saveStreak();
    updateStreakUI();
    puzzleMessage.textContent = "Great job! That's the winning move! 🎉 Loading next puzzle...";
    puzzleMessage.className = "puzzle-message success";
    puzzleStatus.textContent = "Solved!";
    setTimeout(loadNextPuzzle, 1100);
  } else {
    streak = 0;
    saveStreak();
    updateStreakUI();
    puzzleMessage.textContent = "Not quite — try again! Hit Reset Puzzle.";
    puzzleMessage.className = "puzzle-message error";
  }
}

document.getElementById("puzzle-hint").addEventListener("click", () => {
  const p = currentPuzzle;
  if (p.solution[0]) {
    const from = p.solution[0].replace(/[^a-h1-8]/g, "").slice(0, 2);
    puzzleMessage.textContent = `Hint: look at the piece on ${from || "the board"}...`;
  } else {
    puzzleMessage.textContent = "Hint: look for a checkmate!";
  }
  puzzleMessage.className = "puzzle-message";
});

document.getElementById("puzzle-next").addEventListener("click", loadNextPuzzle);

updateStreakUI();

document.getElementById("puzzle-reset").addEventListener("click", () => {
  puzzleGame = new Chess(currentPuzzle.fen);
  puzzleBoard.game = puzzleGame;
  puzzleBoard.lastMove = null;
  puzzleBoard.render();
  puzzleMessage.textContent = "";
  puzzleMessage.className = "puzzle-message";
  puzzleStatus.textContent = puzzleGame.turn() === "w" ? "White to move" : "Black to move";
});

loadNextPuzzle();

/* ================= LESSONS MODE ================= */
const LESSONS = [
  {
    icon: "♙",
    title: "The Pawn",
    text: "Pawns move straight forward one square (two on their first move) but capture diagonally. Click the pawn, then click a highlighted square to move it!",
    fen: "8/8/8/8/8/8/4P3/4K2k w - - 0 1",
  },
  {
    icon: "♘",
    title: "The Knight",
    text: "Knights move in an 'L' shape: two squares one way, then one square sideways. They're the only piece that can jump over others!",
    fen: "8/8/8/3N4/8/8/8/4K2k w - - 0 1",
  },
  {
    icon: "♗",
    title: "The Bishop",
    text: "Bishops slide diagonally as far as they like. Each bishop stays on one color for the whole game!",
    fen: "8/8/8/3B4/8/8/8/4K2k w - - 0 1",
  },
  {
    icon: "♖",
    title: "The Rook",
    text: "Rooks slide in straight lines — up, down, left, or right — as far as they like.",
    fen: "8/8/8/3R4/8/8/8/4K2k w - - 0 1",
  },
  {
    icon: "♕",
    title: "The Queen",
    text: "The queen is the most powerful piece! She moves like a rook AND a bishop combined.",
    fen: "8/8/8/3Q4/8/8/8/4K2k w - - 0 1",
  },
  {
    icon: "♔",
    title: "The King",
    text: "The king moves one square in any direction. Keep him safe — if he's trapped in check, that's checkmate!",
    fen: "8/8/8/3K4/8/8/8/7k w - - 0 1",
  },
  {
    icon: "🏁",
    title: "Setting Up the Board",
    text: "Every game starts the same way! Rooks go in the corners, then knights, then bishops, with the queen on her own color and the king next to her. Pawns line up in front. Remember: 'light square on the right'!",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  },
  {
    icon: "⚠️",
    title: "Check!",
    text: "When a king is under attack, it's called 'check' — and the king MUST get to safety right away. You can move the king away, block the attack, or capture the attacker. Try getting this king out of check!",
    fen: "4k3/8/8/8/8/8/4r3/4K3 w - - 0 1",
  },
  {
    icon: "🏰",
    title: "Castling",
    text: "Castling is a special move where the king hops two squares toward a rook, and the rook jumps to the other side! It keeps your king safe and gets a rook into the game. Click the king and look for the special castling move.",
    fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
  },
  {
    icon: "👻",
    title: "En Passant",
    text: "This sneaky pawn move has a French name meaning 'in passing'! If an enemy pawn zooms past your pawn two squares, you can capture it as if it only moved one. It only works right away. Try it here!",
    fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1",
  },
  {
    icon: "👑",
    title: "Pawn Promotion",
    text: "If a pawn makes it all the way to the other end of the board, it transforms into any piece you want — usually a queen! Move this pawn to the last row and watch it promote.",
    fen: "k7/4P3/8/8/8/8/8/4K3 w - - 0 1",
  },
];

const lessonsMenu = document.getElementById("lessons-menu");
const lessonDetail = document.getElementById("lesson-detail");
const lessonTitle = document.getElementById("lesson-title");
const lessonText = document.getElementById("lesson-text");
const lessonStatus = document.getElementById("lesson-status");
let lessonBoard, lessonGame;

LESSONS.forEach((lesson, i) => {
  const card = document.createElement("button");
  card.className = "lesson-card";
  card.innerHTML = `<span class="icon">${lesson.icon}</span><h3>${lesson.title}</h3><p>${lesson.text.split(".")[0]}.</p>`;
  card.addEventListener("click", () => openLesson(i));
  lessonsMenu.appendChild(card);
});

function openLesson(i) {
  const lesson = LESSONS[i];
  lessonsMenu.classList.add("hidden");
  lessonDetail.classList.remove("hidden");
  lessonTitle.textContent = lesson.title;
  lessonText.textContent = lesson.text;
  lessonGame = new Chess(lesson.fen);
  lessonStatus.textContent = "Try moving the highlighted piece!";

  if (!lessonBoard) {
    lessonBoard = new BoardUI(document.getElementById("lesson-board"), lessonGame, {
      onUserMove: () => {
        lessonStatus.textContent = "Nice move! Try another. 🎉";
      },
    });
  } else {
    lessonBoard.game = lessonGame;
    lessonBoard.lastMove = null;
    lessonBoard.render();
  }
}

document.getElementById("lesson-back").addEventListener("click", () => {
  lessonDetail.classList.add("hidden");
  lessonsMenu.classList.remove("hidden");
});

document.getElementById("lesson-next").addEventListener("click", () => {
  lessonGame.reset ? null : null;
  const idx = LESSONS.findIndex((l) => l.title === lessonTitle.textContent);
  const nextIdx = (idx + 1) % LESSONS.length;
  openLesson(nextIdx);
});
