/* ---------- Navigation ---------- */
const tabButtons = document.querySelectorAll(".tab-btn");
const views = document.querySelectorAll(".view");

function showView(name) {
  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  views.forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  if (name === "leaderboard") renderLeaderboard();
}

tabButtons.forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
document.querySelectorAll("[data-goto]").forEach((el) =>
  el.addEventListener("click", () => showView(el.dataset.goto))
);

/* ---------- Profiles (local login / signup) ---------- */
const AVATARS = ["🦁", "🐯", "🦊", "🐼", "🐸", "🐧", "🦉", "🐢", "🦖", "🦄", "🐶", "🐱", "🐵", "🦋", "🐳", "🐲", "🦕", "🐨"];

const PROFILES_KEY = "pp-profiles";
const CURRENT_PROFILE_KEY = "pp-current-profile";

function getProfiles() {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function getCurrentProfileId() {
  return localStorage.getItem(CURRENT_PROFILE_KEY);
}

function setCurrentProfileId(id) {
  localStorage.setItem(CURRENT_PROFILE_KEY, id);
}

function getCurrentProfile() {
  const id = getCurrentProfileId();
  if (!id) return null;
  return getProfiles().find((p) => p.id === id) || null;
}

function updateCurrentProfile(mutator) {
  const profiles = getProfiles();
  const id = getCurrentProfileId();
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  mutator(profiles[idx]);
  saveProfiles(profiles);
  return profiles[idx];
}

const profileModal = document.getElementById("profile-modal");
const modalSelectScreen = document.getElementById("modal-select-screen");
const modalSignupScreen = document.getElementById("modal-signup-screen");
const profileListEl = document.getElementById("profile-list");
const avatarGridEl = document.getElementById("avatar-grid");
const signupNameEl = document.getElementById("signup-name");
const signupErrorEl = document.getElementById("signup-error");
const profileBadge = document.getElementById("profile-badge");
const profileBadgeAvatar = document.getElementById("profile-badge-avatar");
const profileBadgeName = document.getElementById("profile-badge-name");

let selectedAvatar = AVATARS[0];

function openModal(forceSignup) {
  profileModal.classList.remove("hidden");
  const profiles = getProfiles();
  if (forceSignup || profiles.length === 0) {
    showSignupScreen();
  } else {
    showSelectScreen();
  }
}

function closeModal() {
  profileModal.classList.add("hidden");
}

function showSelectScreen() {
  modalSelectScreen.classList.remove("hidden");
  modalSignupScreen.classList.add("hidden");
  renderProfileList();
}

function showSignupScreen() {
  modalSelectScreen.classList.add("hidden");
  modalSignupScreen.classList.remove("hidden");
  signupNameEl.value = "";
  signupErrorEl.textContent = "";
  selectedAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  renderAvatarGrid();
}

function renderProfileList() {
  const profiles = getProfiles();
  profileListEl.innerHTML = "";
  profiles.forEach((p) => {
    const tile = document.createElement("button");
    tile.className = "profile-tile";
    tile.innerHTML = `<span class="avatar-emoji">${p.avatar}</span><span class="profile-name">${p.name}</span><span class="profile-delete" title="Delete player">✕</span>`;
    tile.addEventListener("click", (e) => {
      if (e.target.classList.contains("profile-delete")) return;
      selectProfile(p.id);
    });
    tile.querySelector(".profile-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteProfile(p.id);
    });
    profileListEl.appendChild(tile);
  });
}

function renderAvatarGrid() {
  avatarGridEl.innerHTML = "";
  AVATARS.forEach((a) => {
    const btn = document.createElement("button");
    btn.className = "avatar-option" + (a === selectedAvatar ? " selected" : "");
    btn.textContent = a;
    btn.addEventListener("click", () => {
      selectedAvatar = a;
      renderAvatarGrid();
    });
    avatarGridEl.appendChild(btn);
  });
}

function selectProfile(id) {
  setCurrentProfileId(id);
  closeModal();
  refreshProfileUI();
}

function deleteProfile(id) {
  const profiles = getProfiles().filter((p) => p.id !== id);
  saveProfiles(profiles);
  if (getCurrentProfileId() === id) {
    localStorage.removeItem(CURRENT_PROFILE_KEY);
  }
  if (profiles.length === 0) {
    showSignupScreen();
  } else {
    renderProfileList();
  }
}

function createProfile() {
  const name = signupNameEl.value.trim();
  if (!name) {
    signupErrorEl.textContent = "Please type a name!";
    return;
  }
  const profiles = getProfiles();
  const profile = {
    id: "p" + Date.now() + Math.floor(Math.random() * 10000),
    name,
    avatar: selectedAvatar,
    streak: 0,
    bestStreak: 0,
    solvedCount: 0,
  };
  profiles.push(profile);
  saveProfiles(profiles);
  setCurrentProfileId(profile.id);
  closeModal();
  refreshProfileUI();
}

function refreshProfileUI() {
  const profile = getCurrentProfile();
  if (!profile) return;
  profileBadgeAvatar.textContent = profile.avatar;
  profileBadgeName.textContent = profile.name;
  streak = profile.streak || 0;
  bestStreak = profile.bestStreak || 0;
  solvedCount = profile.solvedCount || 0;
  updateStreakUI();
}

profileBadge.addEventListener("click", () => openModal(false));
document.getElementById("show-signup").addEventListener("click", () => showSignupScreen());
document.getElementById("signup-back").addEventListener("click", () => {
  if (getProfiles().length === 0) return; // must create at least one profile
  showSelectScreen();
});
document.getElementById("signup-create").addEventListener("click", createProfile);
signupNameEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createProfile();
});

function renderLeaderboard() {
  const listEl = document.getElementById("leaderboard-list");
  const profiles = getProfiles().slice().sort((a, b) => {
    if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
    return b.solvedCount - a.solvedCount;
  });
  const currentId = getCurrentProfileId();
  listEl.innerHTML = "";
  if (profiles.length === 0) {
    listEl.innerHTML = '<div class="leaderboard-empty">No players yet — sign up to get on the board! 🏆</div>';
    return;
  }
  const medalClass = ["gold", "silver", "bronze"];
  profiles.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "leaderboard-row" + (p.id === currentId ? " me" : "");
    const rankClass = medalClass[i] || "";
    const rankIcon = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
    row.innerHTML = `
      <span class="lb-rank ${rankClass}">${rankIcon}</span>
      <span class="lb-avatar">${p.avatar}</span>
      <span class="lb-info">
        <div class="lb-name">${p.name}${p.id === currentId ? " (you)" : ""}</div>
        <div class="lb-stats">${p.solvedCount || 0} puzzles solved</div>
      </span>
      <span class="lb-streak">🔥 ${p.bestStreak || 0}</span>
    `;
    listEl.appendChild(row);
  });
}


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
  { d: "easy", title: "Free Lunch", desc: "White to move. Capture the undefended pawn!", fen: "4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1", solution: ["exd5"] },
  { d: "easy", title: "Back Rank", desc: "White to move. The black king has no escape squares — find mate in 1!", fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", solution: ["Ra8#"] },
  { d: "easy", title: "Sneaky Check", desc: "Black to move. Find the queen move that captures a pawn and gives check!", fen: "rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R b KQkq - 2 3", solution: ["Qxf2+"] },
  { d: "easy", title: "Easy Mate", desc: "Black to move. One move checkmate!", fen: "6k1/8/8/8/8/8/6PP/q5K1 b - - 0 1", solution: ["Qe1#"] },
  { d: "easy", title: "Grab the Rook", desc: "White to move. Win the undefended rook!", fen: "4k3/8/8/8/8/3r4/3Q4/4K3 w - - 0 1", solution: ["Qxd3"] },
  { d: "easy", title: "Ladder Mate", desc: "White to move. Deliver checkmate with your rook!", fen: "k7/8/1KR5/8/8/8/8/8 w - - 0 1", solution: ["Rc8#"] },
  { d: "easy", title: "Loose Bishop", desc: "White to move. That bishop is hanging — capture it for free!", fen: "4k3/8/8/8/2b5/8/B7/4K3 w - - 0 1", solution: ["Bxc4"] },
  { d: "easy", title: "Corner Mate", desc: "White to move. Trap the king in the corner — mate in 1!", fen: "7k/6pp/8/8/8/8/8/Q6K w - - 0 1", solution: ["Qa8#"] },
  { d: "easy", title: "Take the Queen", desc: "Black to move. The white queen wandered somewhere dangerous — capture it for free!", fen: "4k3/8/2n5/8/3Q4/8/8/4K3 b - - 0 1", solution: ["Nxd4"] },
  { d: "easy", title: "Queen Check", desc: "White to move. Move the queen so it checks the king!", fen: "4k3/8/8/8/8/8/8/3QK3 w - - 0 1", solution: ["Qd8+"] },
  { d: "medium", title: "Center Grab", desc: "White to move. Win a free pawn in the center.", fen: "rnb1kbnr/ppp2ppp/8/3pp3/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 0 3", solution: ["exd5"] },
  { d: "medium", title: "Skewer", desc: "White to move. Check the king — the queen behind it has nowhere to hide!", fen: "q7/8/8/k7/8/8/8/1R2K3 w - - 0 1", solution: ["Ra1+"] },
  { d: "medium", title: "Trap the Queen", desc: "Black to move. Grab the free central pawn!", fen: "rnb1kbnr/ppp2ppp/8/3qp3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 3", solution: ["Qxe4+"] },
  { d: "medium", title: "Immediate Mate", desc: "White to move. Deliver checkmate right now!", fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1", solution: ["Re8#"] },
  { d: "medium", title: "Clearance", desc: "White to move. Trade off the blocker with check!", fen: "4k3/4r3/8/8/8/8/4R3/4K3 w - - 0 1", solution: ["Rxe7+"] },
  { d: "medium", title: "Open File Mate", desc: "White to move. Deliver checkmate down the open file!", fen: "3r2k1/5ppp/8/8/8/8/5PP1/3R2K1 w - - 0 1", solution: ["Rxd8#"] },
  { d: "medium", title: "Rook Fork", desc: "White to move. Check the king and attack the bishop at the same time!", fen: "4k3/8/8/8/1b5R/8/8/6K1 w - - 0 1", solution: ["Re4+"] },
  { d: "medium", title: "Undefended Knight", desc: "White to move. Snap off the loose knight!", fen: "4k3/8/8/3n4/2B5/8/8/4K3 w - - 0 1", solution: ["Bxd5"] },
  { d: "hard", title: "Overload", desc: "White to move. That rook is the only defender — take it and deliver mate!", fen: "2r3k1/5ppp/8/8/8/8/2Q2PPP/2R3K1 w - - 0 1", solution: ["Qxc8#"] },
  { d: "hard", title: "Bishop Snipe", desc: "White to move. The bishop grabs a pawn with check!", fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 2 5", solution: ["Bxf7+"] },
  { d: "hard", title: "Corner Trap", desc: "White to move. Win the trapped knight in the corner!", fen: "4k3/8/8/8/8/1n6/8/1QK5 w - - 0 1", solution: ["Qxb3"] },
  { d: "easy", title: "Back Rank Mate #3", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "4k3/3ppp2/8/8/8/8/2K5/1R6 w - - 0 1", solution: ["Rb8#"] },
  { d: "easy", title: "Bishop Snack #24", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "1K5B/8/8/4p3/8/8/7k/8 w - - 0 1", solution: ["Bxe5+"] },
  { d: "easy", title: "Knight Snack #19", desc: "White to move. Capture the undefended pawn with your knight!", fen: "7k/8/8/8/6K1/3N4/5p2/8 w - - 0 1", solution: ["Nxf2"] },
  { d: "easy", title: "Knight Snack #2", desc: "White to move. Capture the undefended pawn with your knight!", fen: "4k3/7K/5N2/8/4p3/8/8/8 w - - 0 1", solution: ["Nxe4"] },
  { d: "easy", title: "Knight Snack #25", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/2k5/8/8/1K1N4/8/4p3/8 w - - 0 1", solution: ["Nxe2"] },
  { d: "easy", title: "Corner Mate #4", desc: "White to move. Trap the king in the corner — checkmate in 1!", fen: "k7/pp6/8/8/6K1/8/3Q4/8 w - - 0 1", solution: ["Qd8#"] },
  { d: "easy", title: "Queen Snack #13", desc: "White to move. Capture the undefended pawn with your queen!", fen: "8/Q7/8/8/8/p5k1/8/7K w - - 0 1", solution: ["Qxa3+"] },
  { d: "easy", title: "Queen Snack #24", desc: "White to move. Capture the undefended pawn with your queen!", fen: "5k2/3K4/8/1Qp5/8/8/8/8 w - - 0 1", solution: ["Qxc5+"] },
  { d: "easy", title: "Bishop Snack #18", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "8/8/2p2K2/8/8/1k3B2/8/8 w - - 0 1", solution: ["Bxc6"] },
  { d: "easy", title: "Queen Snack #6", desc: "White to move. Capture the undefended pawn with your queen!", fen: "7k/Q2p4/8/8/8/2K5/8/8 w - - 0 1", solution: ["Qxd7"] },
  { d: "easy", title: "Queen Snack #11", desc: "White to move. Capture the undefended pawn with your queen!", fen: "8/Q1k5/8/8/8/8/3K1p2/8 w - - 0 1", solution: ["Qxf2"] },
  { d: "easy", title: "Queen Snack #12", desc: "White to move. Capture the undefended pawn with your queen!", fen: "3K4/Q5p1/8/8/8/8/k7/8 w - - 0 1", solution: ["Qxg7"] },
  { d: "easy", title: "Bishop Snack #25", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "7B/8/8/1K6/3p4/6k1/8/8 w - - 0 1", solution: ["Bxd4"] },
  { d: "easy", title: "Bishop Snack #4", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "8/1k1K4/8/8/8/8/7p/6B1 w - - 0 1", solution: ["Bxh2"] },
  { d: "easy", title: "Rook Snack #11", desc: "White to move. Capture the undefended pawn with your rook!", fen: "8/6Rp/8/8/8/6K1/8/7k w - - 0 1", solution: ["Rxh7+"] },
  { d: "easy", title: "Bishop Snack #16", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "8/1p2k3/8/7K/8/5B2/8/8 w - - 0 1", solution: ["Bxb7"] },
  { d: "easy", title: "Rook Snack #18", desc: "White to move. Capture the undefended pawn with your rook!", fen: "8/k7/8/1p6/7K/8/1R6/8 w - - 0 1", solution: ["Rxb5"] },
  { d: "easy", title: "Rook Snack #4", desc: "White to move. Capture the undefended pawn with your rook!", fen: "8/3p2R1/8/7K/8/5k2/8/8 w - - 0 1", solution: ["Rxd7"] },
  { d: "easy", title: "Back Rank Mate #7", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "6k1/5ppp/8/8/8/K7/8/4R3 w - - 0 1", solution: ["Re8#"] },
  { d: "easy", title: "Queen Snack #5", desc: "White to move. Capture the undefended pawn with your queen!", fen: "6k1/Q7/p7/7K/8/8/8/8 w - - 0 1", solution: ["Qxa6"] },
  { d: "easy", title: "Rook Snack #3", desc: "White to move. Capture the undefended pawn with your rook!", fen: "2K5/6R1/8/8/8/6p1/8/7k w - - 0 1", solution: ["Rxg3"] },
  { d: "easy", title: "Back Rank Mate #4", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "4k3/3ppp2/8/8/8/8/7K/2R5 w - - 0 1", solution: ["Rc8#"] },
  { d: "easy", title: "Corner Mate #2", desc: "White to move. Trap the king in the corner — checkmate in 1!", fen: "k7/pp6/8/8/8/8/1Q6/7K w - - 0 1", solution: ["Qh8#"] },
  { d: "easy", title: "Knight Snack #15", desc: "White to move. Capture the undefended pawn with your knight!", fen: "1k6/4p3/8/5N2/8/6K1/8/8 w - - 0 1", solution: ["Nxe7"] },
  { d: "easy", title: "Queen Snack #19", desc: "White to move. Capture the undefended pawn with your queen!", fen: "8/4K3/2p5/1Q6/3k4/8/8/8 w - - 0 1", solution: ["Qxc6"] },
  { d: "easy", title: "Back Rank Mate #2", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "4k3/3ppp2/8/8/8/8/K7/6R1 w - - 0 1", solution: ["Rg8#"] },
  { d: "easy", title: "Knight Snack #23", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/3K4/8/6k1/3N4/1p6/8/8 w - - 0 1", solution: ["Nxb3"] },
  { d: "easy", title: "Back Rank Mate #20", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "3k4/2ppp3/8/8/8/8/3K4/5R2 w - - 0 1", solution: ["Rf8#"] },
  { d: "easy", title: "Knight Snack #30", desc: "White to move. Capture the undefended pawn with your knight!", fen: "4K3/8/k7/8/3N4/5p2/8/8 w - - 0 1", solution: ["Nxf3"] },
  { d: "easy", title: "Bishop Snack #5", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "8/p7/8/K7/8/2k5/8/6B1 w - - 0 1", solution: ["Bxa7"] },
  { d: "easy", title: "Knight Snack #26", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/8/2p5/8/3N1K2/8/8/7k w - - 0 1", solution: ["Nxc6"] },
  { d: "easy", title: "Corner Mate #1", desc: "White to move. Trap the king in the corner — checkmate in 1!", fen: "k7/pp6/8/6K1/8/8/8/Q7 w - - 0 1", solution: ["Qh8#"] },
  { d: "easy", title: "Knight Snack #21", desc: "White to move. Capture the undefended pawn with your knight!", fen: "5K2/8/8/2p5/8/3N1k2/8/8 w - - 0 1", solution: ["Nxc5"] },
  { d: "easy", title: "Knight Snack #24", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/8/8/1K3p2/3N4/k7/8/8 w - - 0 1", solution: ["Nxf5"] },
  { d: "easy", title: "Queen Snack #14", desc: "White to move. Capture the undefended pawn with your queen!", fen: "8/Q4p2/8/6k1/8/8/5K2/8 w - - 0 1", solution: ["Qxf7"] },
  { d: "easy", title: "Bishop Snack #6", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "2K5/8/2k5/8/8/8/5p2/6B1 w - - 0 1", solution: ["Bxf2"] },
  { d: "easy", title: "Rook Snack #2", desc: "White to move. Capture the undefended pawn with your rook!", fen: "3K4/6R1/8/8/3k2p1/8/8/8 w - - 0 1", solution: ["Rxg4+"] },
  { d: "easy", title: "Corner Mate #8", desc: "White to move. Trap the king in the corner — checkmate in 1!", fen: "k7/pp4K1/8/8/8/8/8/7Q w - - 0 1", solution: ["Qh8#"] },
  { d: "easy", title: "Bishop Snack #1", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "5k2/7K/8/8/8/4p3/8/6B1 w - - 0 1", solution: ["Bxe3"] },
  { d: "easy", title: "Knight Snack #29", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/7K/4p3/8/3N4/8/8/7k w - - 0 1", solution: ["Nxe6"] },
  { d: "easy", title: "Rook Snack #20", desc: "White to move. Capture the undefended pawn with your rook!", fen: "6K1/3k4/8/8/8/1p6/1R6/8 w - - 0 1", solution: ["Rxb3"] },
  { d: "easy", title: "Bishop Snack #11", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "5k2/p7/1B6/8/8/1K6/8/8 w - - 0 1", solution: ["Bxa7"] },
  { d: "easy", title: "Knight Snack #31", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/k7/6N1/3K4/5p2/8/8/8 w - - 0 1", solution: ["Nxf4"] },
  { d: "easy", title: "Rook Snack #7", desc: "White to move. Capture the undefended pawn with your rook!", fen: "8/p5R1/8/8/8/6K1/8/3k4 w - - 0 1", solution: ["Rxa7"] },
  { d: "easy", title: "Corner Mate #5", desc: "White to move. Trap the king in the corner — checkmate in 1!", fen: "k7/pp6/8/8/8/1K6/8/4Q3 w - - 0 1", solution: ["Qe8#"] },
  { d: "easy", title: "Knight Snack #4", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/K2p4/5N2/8/8/8/8/5k2 w - - 0 1", solution: ["Nxd7"] },
  { d: "easy", title: "Knight Snack #11", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/8/2k5/5N2/8/6p1/K7/8 w - - 0 1", solution: ["Nxg3"] },
  { d: "easy", title: "Corner Mate #11", desc: "White to move. Trap the king in the corner — checkmate in 1!", fen: "7k/3K2pp/8/8/8/8/8/1Q6 w - - 0 1", solution: ["Qb8#"] },
  { d: "easy", title: "Back Rank Mate #26", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "5k2/4ppp1/8/8/8/1K6/8/2R5 w - - 0 1", solution: ["Rc8#"] },
  { d: "easy", title: "Queen Snack #18", desc: "White to move. Capture the undefended pawn with your queen!", fen: "8/1p6/8/1Q1k4/8/8/8/6K1 w - - 0 1", solution: ["Qxb7+"] },
  { d: "easy", title: "Back Rank Mate #19", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "3k4/2ppp3/8/8/8/5K2/8/7R w - - 0 1", solution: ["Rh8#"] },
  { d: "easy", title: "Knight Snack #17", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/5K2/8/4p3/8/3N3k/8/8 w - - 0 1", solution: ["Nxe5"] },
  { d: "easy", title: "Back Rank Mate #28", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "5k2/4ppp1/8/8/8/2K5/8/1R6 w - - 0 1", solution: ["Rb8#"] },
  { d: "easy", title: "Bishop Snack #19", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "1k6/8/8/8/8/5B2/K5p1/8 w - - 0 1", solution: ["Bxg2"] },
  { d: "easy", title: "Back Rank Mate #17", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "3k4/2ppp3/8/8/8/8/2K5/1R6 w - - 0 1", solution: ["Rb8#"] },
  { d: "easy", title: "Corner Mate #7", desc: "White to move. Trap the king in the corner — checkmate in 1!", fen: "k7/pp6/8/8/8/7K/8/6Q1 w - - 0 1", solution: ["Qg8#"] },
  { d: "easy", title: "Queen Snack #2", desc: "White to move. Capture the undefended pawn with your queen!", fen: "8/Q7/8/p3K3/8/8/8/6k1 w - - 0 1", solution: ["Qxa5"] },
  { d: "easy", title: "Corner Mate #17", desc: "White to move. Trap the king in the corner — checkmate in 1!", fen: "7k/6pp/8/2K5/8/8/7Q/8 w - - 0 1", solution: ["Qb8#"] },
  { d: "easy", title: "Knight Snack #9", desc: "White to move. Capture the undefended pawn with your knight!", fen: "3k4/8/3p4/5N2/8/8/8/2K5 w - - 0 1", solution: ["Nxd6"] },
  { d: "easy", title: "Back Rank Mate #23", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "1k6/ppp5/8/8/8/7K/8/3R4 w - - 0 1", solution: ["Rd8#"] },
  { d: "easy", title: "Corner Mate #12", desc: "White to move. Trap the king in the corner — checkmate in 1!", fen: "7k/6pp/8/8/8/8/4K3/2Q5 w - - 0 1", solution: ["Qc8#"] },
  { d: "easy", title: "Knight Snack #10", desc: "White to move. Capture the undefended pawn with your knight!", fen: "k7/8/7p/5N2/8/8/2K5/8 w - - 0 1", solution: ["Nxh6"] },
  { d: "easy", title: "Back Rank Mate #30", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "5k2/4ppp1/8/8/8/8/1K6/R7 w - - 0 1", solution: ["Ra8#"] },
  { d: "easy", title: "Back Rank Mate #8", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "6k1/5ppp/8/8/8/6K1/8/3R4 w - - 0 1", solution: ["Rd8#"] },
  { d: "easy", title: "Back Rank Mate #29", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "5k2/4ppp1/8/8/8/8/6K1/7R w - - 0 1", solution: ["Rh8#"] },
  { d: "easy", title: "Rook Snack #17", desc: "White to move. Capture the undefended pawn with your rook!", fen: "8/1p6/8/7k/3K4/8/1R6/8 w - - 0 1", solution: ["Rxb7"] },
  { d: "easy", title: "Knight Snack #38", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/2K5/8/8/1N6/3p4/8/4k3 w - - 0 1", solution: ["Nxd3+"] },
  { d: "easy", title: "Bishop Snack #21", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "k6K/8/8/3p4/8/5B2/8/8 w - - 0 1", solution: ["Bxd5+"] },
  { d: "easy", title: "Rook Snack #6", desc: "White to move. Capture the undefended pawn with your rook!", fen: "8/6R1/6p1/8/8/5k1K/8/8 w - - 0 1", solution: ["Rxg6"] },
  { d: "easy", title: "Bishop Snack #2", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "6K1/8/1p6/8/8/2k5/8/6B1 w - - 0 1", solution: ["Bxb6"] },
  { d: "easy", title: "Back Rank Mate #27", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "5k2/4ppp1/8/8/8/8/4K3/3R4 w - - 0 1", solution: ["Rd8#"] },
  { d: "easy", title: "Bishop Snack #28", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "8/8/3B4/8/1p6/5K2/3k4/8 w - - 0 1", solution: ["Bxb4+"] },
  { d: "easy", title: "Bishop Snack #12", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "8/2p5/1B6/3K4/8/8/8/2k5 w - - 0 1", solution: ["Bxc7"] },
  { d: "easy", title: "Knight Snack #20", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/8/8/8/1p6/3N1K2/8/3k4 w - - 0 1", solution: ["Nxb4"] },
  { d: "easy", title: "Rook Snack #1", desc: "White to move. Capture the undefended pawn with your rook!", fen: "8/1p4R1/8/8/8/1k2K3/8/8 w - - 0 1", solution: ["Rxb7+"] },
  { d: "easy", title: "Knight Snack #1", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/8/5N2/8/6p1/K7/8/1k6 w - - 0 1", solution: ["Nxg4"] },
  { d: "easy", title: "Knight Snack #12", desc: "White to move. Capture the undefended pawn with your knight!", fen: "2K5/8/8/5N2/8/1k2p3/8/8 w - - 0 1", solution: ["Nxe3"] },
  { d: "easy", title: "Queen Snack #21", desc: "White to move. Capture the undefended pawn with your queen!", fen: "8/8/8/1Q6/8/2K5/4p3/7k w - - 0 1", solution: ["Qxe2"] },
  { d: "easy", title: "Queen Snack #1", desc: "White to move. Capture the undefended pawn with your queen!", fen: "3K4/Q7/8/2p5/8/8/4k3/8 w - - 0 1", solution: ["Qxc5"] },
  { d: "easy", title: "Knight Snack #5", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/7p/5N2/8/8/1K5k/8/8 w - - 0 1", solution: ["Nxh7"] },
  { d: "easy", title: "Queen Snack #7", desc: "White to move. Capture the undefended pawn with your queen!", fen: "8/Q7/8/8/p7/2K5/8/3k4 w - - 0 1", solution: ["Qxa4+"] },
  { d: "easy", title: "Queen Snack #22", desc: "White to move. Capture the undefended pawn with your queen!", fen: "2k5/8/8/1Q2p3/7K/8/8/8 w - - 0 1", solution: ["Qxe5"] },
  { d: "easy", title: "Bishop Snack #3", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "8/4K3/8/8/3p4/8/8/1k4B1 w - - 0 1", solution: ["Bxd4"] },
  { d: "easy", title: "Bishop Snack #7", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "8/8/8/2p3k1/8/8/8/K5B1 w - - 0 1", solution: ["Bxc5"] },
  { d: "easy", title: "Knight Snack #13", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/7k/8/5N2/3p4/8/8/3K4 w - - 0 1", solution: ["Nxd4"] },
  { d: "easy", title: "Knight Snack #8", desc: "White to move. Capture the undefended pawn with your knight!", fen: "5k2/8/8/8/1p6/7K/N7/8 w - - 0 1", solution: ["Nxb4"] },
  { d: "easy", title: "Corner Mate #18", desc: "White to move. Trap the king in the corner — checkmate in 1!", fen: "6pk/7p/7K/8/8/2Q5/8/8 w - - 0 1", solution: ["Qg7#"] },
  { d: "easy", title: "Bishop Snack #20", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "8/3K4/8/k7/4p3/5B2/8/8 w - - 0 1", solution: ["Bxe4"] },
  { d: "easy", title: "Bishop Snack #26", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "1k5B/3K2p1/8/8/8/8/8/8 w - - 0 1", solution: ["Bxg7"] },
  { d: "easy", title: "Rook Snack #8", desc: "White to move. Capture the undefended pawn with your rook!", fen: "8/2p3R1/8/8/k1K5/8/8/8 w - - 0 1", solution: ["Rxc7"] },
  { d: "easy", title: "Queen Snack #10", desc: "White to move. Capture the undefended pawn with your queen!", fen: "6K1/Q7/8/8/1k6/8/p7/8 w - - 0 1", solution: ["Qxa2"] },
  { d: "easy", title: "Queen Snack #3", desc: "White to move. Capture the undefended pawn with your queen!", fen: "8/Q7/8/8/3p3K/8/7k/8 w - - 0 1", solution: ["Qxd4"] },
  { d: "easy", title: "Knight Snack #34", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/8/6N1/1K6/7p/8/4k3/8 w - - 0 1", solution: ["Nxh4"] },
  { d: "easy", title: "Knight Snack #14", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/8/8/5N2/2K4p/8/k7/8 w - - 0 1", solution: ["Nxh4"] },
  { d: "easy", title: "Corner Mate #15", desc: "White to move. Trap the king in the corner — checkmate in 1!", fen: "7k/6pp/8/6K1/8/8/8/5Q2 w - - 0 1", solution: ["Qf8#"] },
  { d: "easy", title: "Back Rank Mate #14", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "2k5/1ppp4/8/8/8/8/4K3/5R2 w - - 0 1", solution: ["Rf8#"] },
  { d: "easy", title: "Knight Snack #40", desc: "White to move. Capture the undefended pawn with your knight!", fen: "1k6/8/8/8/1N6/5K2/p7/8 w - - 0 1", solution: ["Nxa2"] },
  { d: "easy", title: "Corner Mate #6", desc: "White to move. Trap the king in the corner — checkmate in 1!", fen: "k7/pp6/8/K7/8/8/8/5Q2 w - - 0 1", solution: ["Qf8#"] },
  { d: "easy", title: "Bishop Snack #8", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "8/8/1B6/8/3p4/k7/3K4/8 w - - 0 1", solution: ["Bxd4"] },
  { d: "easy", title: "Bishop Snack #27", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "7B/8/8/1k6/8/3K4/1p6/8 w - - 0 1", solution: ["Bxb2"] },
  { d: "easy", title: "Queen Snack #20", desc: "White to move. Capture the undefended pawn with your queen!", fen: "7k/8/1p1K4/1Q6/8/8/8/8 w - - 0 1", solution: ["Qxb6"] },
  { d: "easy", title: "Corner Mate #3", desc: "White to move. Trap the king in the corner — checkmate in 1!", fen: "k7/pp6/8/K7/8/8/8/2Q5 w - - 0 1", solution: ["Qc8#"] },
  { d: "easy", title: "Bishop Snack #23", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "7B/8/5p2/8/3k4/8/8/3K4 w - - 0 1", solution: ["Bxf6+"] },
  { d: "easy", title: "Rook Snack #25", desc: "White to move. Capture the undefended pawn with your rook!", fen: "7R/4K3/7p/8/8/8/6k1/8 w - - 0 1", solution: ["Rxh6"] },
  { d: "easy", title: "Corner Mate #14", desc: "White to move. Trap the king in the corner — checkmate in 1!", fen: "7k/6pp/8/8/8/6K1/8/4Q3 w - - 0 1", solution: ["Qe8#"] },
  { d: "easy", title: "Rook Snack #15", desc: "White to move. Capture the undefended pawn with your rook!", fen: "8/3K4/5k2/8/8/8/1R5p/8 w - - 0 1", solution: ["Rxh2"] },
  { d: "easy", title: "Rook Snack #10", desc: "White to move. Capture the undefended pawn with your rook!", fen: "8/6R1/8/3k4/1K6/8/6p1/8 w - - 0 1", solution: ["Rxg2"] },
  { d: "easy", title: "Back Rank Mate #5", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "4k3/3ppp2/8/8/8/1K6/8/7R w - - 0 1", solution: ["Rh8#"] },
  { d: "easy", title: "Rook Snack #13", desc: "White to move. Capture the undefended pawn with your rook!", fen: "8/3K4/8/8/8/8/1R1p4/6k1 w - - 0 1", solution: ["Rxd2"] },
  { d: "easy", title: "Rook Snack #16", desc: "White to move. Capture the undefended pawn with your rook!", fen: "8/8/1p6/8/4k3/7K/1R6/8 w - - 0 1", solution: ["Rxb6"] },
  { d: "easy", title: "Queen Snack #9", desc: "White to move. Capture the undefended pawn with your queen!", fen: "8/Q7/7k/8/8/K3p3/8/8 w - - 0 1", solution: ["Qxe3+"] },
  { d: "easy", title: "Back Rank Mate #15", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "2k5/1ppp4/8/8/8/8/3K4/6R1 w - - 0 1", solution: ["Rg8#"] },
  { d: "easy", title: "Queen Snack #15", desc: "White to move. Capture the undefended pawn with your queen!", fen: "8/Q1p5/8/1K6/7k/8/8/8 w - - 0 1", solution: ["Qxc7"] },
  { d: "easy", title: "Bishop Snack #30", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "8/2p2k2/3B4/5K2/8/8/8/8 w - - 0 1", solution: ["Bxc7"] },
  { d: "easy", title: "Back Rank Mate #25", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "1k6/ppp5/8/8/8/4K3/8/7R w - - 0 1", solution: ["Rh8#"] },
  { d: "easy", title: "Queen Snack #4", desc: "White to move. Capture the undefended pawn with your queen!", fen: "8/Qp6/8/7k/8/8/4K3/8 w - - 0 1", solution: ["Qxb7"] },
  { d: "easy", title: "Back Rank Mate #16", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "3k4/2ppp3/8/8/8/8/3K4/6R1 w - - 0 1", solution: ["Rg8#"] },
  { d: "easy", title: "Back Rank Mate #21", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "1k6/ppp5/8/8/8/6K1/8/5R2 w - - 0 1", solution: ["Rf8#"] },
  { d: "easy", title: "Bishop Snack #15", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "8/7k/8/8/6p1/5B2/8/6K1 w - - 0 1", solution: ["Bxg4"] },
  { d: "easy", title: "Bishop Snack #17", desc: "White to move. Capture the undefended pawn with your bishop!", fen: "8/8/k7/8/8/5B2/4p3/7K w - - 0 1", solution: ["Bxe2+"] },
  { d: "easy", title: "Back Rank Mate #10", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "6k1/5ppp/8/8/8/8/5K2/R7 w - - 0 1", solution: ["Ra8#"] },
  { d: "easy", title: "Back Rank Mate #9", desc: "White to move. The king is trapped behind its own pawns — find mate in 1!", fen: "6k1/5ppp/8/8/8/8/3K4/2R5 w - - 0 1", solution: ["Rc8#"] },
  { d: "easy", title: "Rook Snack #22", desc: "White to move. Capture the undefended pawn with your rook!", fen: "8/7k/8/8/8/4K3/1R4p1/8 w - - 0 1", solution: ["Rxg2"] },
  { d: "easy", title: "Knight Snack #3", desc: "White to move. Capture the undefended pawn with your knight!", fen: "8/8/5N2/7p/4K3/8/8/4k3 w - - 0 1", solution: ["Nxh5"] },
  { d: "easy", title: "Knight Snack #27", desc: "White to move. Capture the undefended pawn with your knight!", fen: "5k2/8/8/1p6/3N4/8/8/6K1 w - - 0 1", solution: ["Nxb5"] },
  { d: "easy", title: "Queen Snack #16", desc: "White to move. Capture the undefended pawn with your queen!", fen: "8/Q6p/8/8/1K6/8/8/6k1 w - - 0 1", solution: ["Qxh7"] },
  { d: "medium", title: "Knight Takes Rook #6", desc: "White to move. Capture the undefended rook with your knight!", fen: "8/4N3/6r1/8/7k/3K4/8/8 w - - 0 1", solution: ["Nxg6+"] },
  { d: "medium", title: "Rook Takes Knight #16", desc: "White to move. Capture the undefended knight with your rook!", fen: "8/8/8/4K3/6k1/8/2n2R2/8 w - - 0 1", solution: ["Rxc2"] },
  { d: "medium", title: "Knight Takes Rook #9", desc: "White to move. Capture the undefended rook with your knight!", fen: "8/8/4k3/8/8/2r1K3/N7/8 w - - 0 1", solution: ["Nxc3"] },
  { d: "medium", title: "Bishop Takes Rook #3", desc: "White to move. Capture the undefended rook with your bishop!", fen: "8/7B/8/3K2k1/8/8/8/1r6 w - - 0 1", solution: ["Bxb1"] },
  { d: "medium", title: "Knight Takes Rook #16", desc: "White to move. Capture the undefended rook with your knight!", fen: "8/8/8/1K3N2/3r4/8/8/4k3 w - - 0 1", solution: ["Nxd4"] },
  { d: "medium", title: "Knight Takes Bishop #12", desc: "White to move. Capture the undefended bishop with your knight!", fen: "8/8/3b4/5N2/8/8/3K3k/8 w - - 0 1", solution: ["Nxd6"] },
  { d: "medium", title: "Rook Takes Knight #1", desc: "White to move. Capture the undefended knight with your rook!", fen: "8/7k/3K4/8/8/8/8/5n1R w - - 0 1", solution: ["Rxf1"] },
  { d: "medium", title: "Ladder Mate #17", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "8/3K4/8/8/8/5R2/5R2/5k2 w - - 0 1", solution: ["Rxf1#"] },
  { d: "medium", title: "Rook Takes Bishop #8", desc: "White to move. Capture the undefended bishop with your rook!", fen: "8/4b1R1/8/6K1/8/8/5k2/8 w - - 0 1", solution: ["Rxe7"] },
  { d: "medium", title: "Ladder Mate #5", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "8/8/8/8/8/2R3K1/R7/6k1 w - - 0 1", solution: ["Ra1#"] },
  { d: "medium", title: "Bishop Takes Rook #14", desc: "White to move. Capture the undefended rook with your bishop!", fen: "8/4k3/6K1/4r3/8/8/1B6/8 w - - 0 1", solution: ["Bxe5"] },
  { d: "medium", title: "Rook Takes Bishop #12", desc: "White to move. Capture the undefended bishop with your rook!", fen: "8/5bR1/8/7k/8/8/1K6/8 w - - 0 1", solution: ["Rxf7"] },
  { d: "medium", title: "Rook Takes Bishop #4", desc: "White to move. Capture the undefended bishop with your rook!", fen: "8/2K3R1/8/8/8/6b1/8/1k6 w - - 0 1", solution: ["Rxg3"] },
  { d: "medium", title: "Rook Takes Knight #9", desc: "White to move. Capture the undefended knight with your rook!", fen: "8/8/1k6/8/3K4/8/8/4n2R w - - 0 1", solution: ["Rxe1"] },
  { d: "medium", title: "Bishop Takes Knight #12", desc: "White to move. Capture the undefended knight with your bishop!", fen: "6B1/8/4n3/2k3K1/8/8/8/8 w - - 0 1", solution: ["Bxe6"] },
  { d: "medium", title: "Ladder Mate #1", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "7k/6R1/7R/7K/8/8/8/8 w - - 0 1", solution: ["Rgg6#"] },
  { d: "medium", title: "Bishop Takes Knight #5", desc: "White to move. Capture the undefended knight with your bishop!", fen: "8/8/3n4/k1B5/8/K7/8/8 w - - 0 1", solution: ["Bxd6"] },
  { d: "medium", title: "Bishop Takes Knight #9", desc: "White to move. Capture the undefended knight with your bishop!", fen: "8/1K2n3/8/2B5/8/7k/8/8 w - - 0 1", solution: ["Bxe7"] },
  { d: "medium", title: "Rook Takes Bishop #13", desc: "White to move. Capture the undefended bishop with your rook!", fen: "8/K2b2R1/8/8/8/8/1k6/8 w - - 0 1", solution: ["Rxd7"] },
  { d: "medium", title: "Bishop Takes Knight #10", desc: "White to move. Capture the undefended knight with your bishop!", fen: "8/5K2/8/2B5/8/8/5n2/k7 w - - 0 1", solution: ["Bxf2"] },
  { d: "medium", title: "Bishop Takes Knight #2", desc: "White to move. Capture the undefended knight with your bishop!", fen: "3K4/8/k7/2B5/1n6/8/8/8 w - - 0 1", solution: ["Bxb4"] },
  { d: "medium", title: "Bishop Takes Knight #18", desc: "White to move. Capture the undefended knight with your bishop!", fen: "6B1/8/k7/3n4/8/6K1/8/8 w - - 0 1", solution: ["Bxd5"] },
  { d: "medium", title: "Knight Takes Rook #20", desc: "White to move. Capture the undefended rook with your knight!", fen: "3k4/8/2N5/r7/8/6K1/8/8 w - - 0 1", solution: ["Nxa5"] },
  { d: "medium", title: "Rook Takes Bishop #15", desc: "White to move. Capture the undefended bishop with your rook!", fen: "6K1/8/8/4k3/8/1b4R1/8/8 w - - 0 1", solution: ["Rxb3"] },
  { d: "medium", title: "Knight Takes Rook #5", desc: "White to move. Capture the undefended rook with your knight!", fen: "8/4N3/8/5r2/k7/8/8/K7 w - - 0 1", solution: ["Nxf5"] },
  { d: "medium", title: "Ladder Mate #8", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "4k3/2R5/4KR2/8/8/8/8/8 w - - 0 1", solution: ["Rc8#"] },
  { d: "medium", title: "Knight Takes Rook #14", desc: "White to move. Capture the undefended rook with your knight!", fen: "4k3/6r1/8/K4N2/8/8/8/8 w - - 0 1", solution: ["Nxg7+"] },
  { d: "medium", title: "Rook Takes Knight #11", desc: "White to move. Capture the undefended knight with your rook!", fen: "7n/8/8/5k2/8/6K1/8/7R w - - 0 1", solution: ["Rxh8"] },
  { d: "medium", title: "Knight Takes Bishop #19", desc: "White to move. Capture the undefended bishop with your knight!", fen: "2k3K1/8/8/8/1b6/8/2N5/8 w - - 0 1", solution: ["Nxb4"] },
  { d: "medium", title: "Rook Takes Bishop #11", desc: "White to move. Capture the undefended bishop with your rook!", fen: "8/3K2Rb/8/8/8/2k5/8/8 w - - 0 1", solution: ["Rxh7"] },
  { d: "medium", title: "Rook Takes Knight #4", desc: "White to move. Capture the undefended knight with your rook!", fen: "8/8/2k5/8/8/8/3K4/1n5R w - - 0 1", solution: ["Rxb1"] },
  { d: "medium", title: "Bishop Takes Rook #7", desc: "White to move. Capture the undefended rook with your bishop!", fen: "1k2K3/7B/8/8/4r3/8/8/8 w - - 0 1", solution: ["Bxe4"] },
  { d: "medium", title: "Knight Takes Bishop #17", desc: "White to move. Capture the undefended bishop with your knight!", fen: "8/8/8/7K/3b4/8/2k1N3/8 w - - 0 1", solution: ["Nxd4+"] },
  { d: "medium", title: "Bishop Takes Knight #16", desc: "White to move. Capture the undefended knight with your bishop!", fen: "6B1/7n/K7/8/8/8/2k5/8 w - - 0 1", solution: ["Bxh7+"] },
  { d: "medium", title: "Knight Takes Bishop #18", desc: "White to move. Capture the undefended bishop with your knight!", fen: "8/8/8/4K3/1k6/6b1/4N3/8 w - - 0 1", solution: ["Nxg3"] },
  { d: "medium", title: "Ladder Mate #14", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "8/8/8/8/8/4R1K1/R7/6k1 w - - 0 1", solution: ["Ra1#"] },
  { d: "medium", title: "Bishop Takes Rook #1", desc: "White to move. Capture the undefended rook with your bishop!", fen: "8/7B/6r1/3K4/8/8/8/k7 w - - 0 1", solution: ["Bxg6"] },
  { d: "medium", title: "Bishop Takes Rook #11", desc: "White to move. Capture the undefended rook with your bishop!", fen: "8/6r1/8/1k6/8/8/1B6/5K2 w - - 0 1", solution: ["Bxg7"] },
  { d: "medium", title: "Bishop Takes Knight #4", desc: "White to move. Capture the undefended knight with your bishop!", fen: "8/n7/8/2B5/8/5k2/8/K7 w - - 0 1", solution: ["Bxa7"] },
  { d: "medium", title: "Knight Takes Bishop #13", desc: "White to move. Capture the undefended bishop with your knight!", fen: "6K1/1k6/8/8/8/2b5/4N3/8 w - - 0 1", solution: ["Nxc3"] },
  { d: "medium", title: "Ladder Mate #6", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "8/8/8/8/8/3R4/R1K5/k7 w - - 0 1", solution: ["Raa3#"] },
  { d: "medium", title: "Knight Takes Bishop #20", desc: "White to move. Capture the undefended bishop with your knight!", fen: "8/6K1/8/2k5/8/8/2N5/4b3 w - - 0 1", solution: ["Nxe1"] },
  { d: "medium", title: "Bishop Takes Rook #9", desc: "White to move. Capture the undefended rook with your bishop!", fen: "5k2/8/8/4K3/8/r7/1B6/8 w - - 0 1", solution: ["Bxa3+"] },
  { d: "medium", title: "Ladder Mate #3", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "2K5/8/8/8/8/7R/6R1/7k w - - 0 1", solution: ["Rgg3#"] },
  { d: "medium", title: "Knight Takes Rook #10", desc: "White to move. Capture the undefended rook with your knight!", fen: "7k/8/8/K4N2/7r/8/8/8 w - - 0 1", solution: ["Nxh4"] },
  { d: "medium", title: "Bishop Takes Knight #1", desc: "White to move. Capture the undefended knight with your bishop!", fen: "8/8/4K1k1/2B5/3n4/8/8/8 w - - 0 1", solution: ["Bxd4"] },
  { d: "medium", title: "Ladder Mate #18", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "8/8/8/8/8/2R4K/R7/7k w - - 0 1", solution: ["Ra1#"] },
  { d: "medium", title: "Ladder Mate #9", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "8/8/8/8/3K4/6R1/7R/7k w - - 0 1", solution: ["Rhh3#"] },
  { d: "medium", title: "Knight Takes Bishop #4", desc: "White to move. Capture the undefended bishop with your knight!", fen: "2K5/6N1/8/3k1b2/8/8/8/8 w - - 0 1", solution: ["Nxf5"] },
  { d: "medium", title: "Knight Takes Bishop #2", desc: "White to move. Capture the undefended bishop with your knight!", fen: "4b3/6N1/8/8/6K1/4k3/8/8 w - - 0 1", solution: ["Nxe8"] },
  { d: "medium", title: "Bishop Takes Rook #8", desc: "White to move. Capture the undefended rook with your bishop!", fen: "6K1/8/8/8/8/2r5/1B6/5k2 w - - 0 1", solution: ["Bxc3"] },
  { d: "medium", title: "Bishop Takes Knight #7", desc: "White to move. Capture the undefended knight with your bishop!", fen: "4K3/8/8/2B5/8/4n3/8/2k5 w - - 0 1", solution: ["Bxe3+"] },
  { d: "medium", title: "Rook Takes Knight #10", desc: "White to move. Capture the undefended knight with your rook!", fen: "8/K7/7n/8/8/8/2k5/7R w - - 0 1", solution: ["Rxh6"] },
  { d: "medium", title: "Rook Takes Bishop #16", desc: "White to move. Capture the undefended bishop with your rook!", fen: "8/8/8/7k/8/2b3R1/4K3/8 w - - 0 1", solution: ["Rxc3"] },
  { d: "medium", title: "Rook Takes Bishop #18", desc: "White to move. Capture the undefended bishop with your rook!", fen: "4K1b1/8/8/8/8/k5R1/8/8 w - - 0 1", solution: ["Rxg8"] },
  { d: "medium", title: "Bishop Takes Rook #15", desc: "White to move. Capture the undefended rook with your bishop!", fen: "8/8/5k2/8/8/4K3/1B6/2r5 w - - 0 1", solution: ["Bxc1"] },
  { d: "medium", title: "Ladder Mate #15", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "8/8/8/3K4/8/4R3/4R3/4k3 w - - 0 1", solution: ["Rxe1#"] },
  { d: "medium", title: "Rook Takes Bishop #9", desc: "White to move. Capture the undefended bishop with your rook!", fen: "8/2b3R1/8/3K4/8/8/3k4/8 w - - 0 1", solution: ["Rxc7"] },
  { d: "medium", title: "Knight Takes Rook #11", desc: "White to move. Capture the undefended rook with your knight!", fen: "8/8/K2r4/5N2/2k5/8/8/8 w - - 0 1", solution: ["Nxd6+"] },
  { d: "medium", title: "Rook Takes Bishop #1", desc: "White to move. Capture the undefended bishop with your rook!", fen: "8/6R1/8/6b1/8/3K4/7k/8 w - - 0 1", solution: ["Rxg5"] },
  { d: "medium", title: "Knight Takes Bishop #7", desc: "White to move. Capture the undefended bishop with your knight!", fen: "8/8/2K5/5N2/3b4/8/8/3k4 w - - 0 1", solution: ["Nxd4"] },
  { d: "medium", title: "Bishop Takes Knight #8", desc: "White to move. Capture the undefended knight with your bishop!", fen: "8/8/1n6/2B5/8/k7/8/2K5 w - - 0 1", solution: ["Bxb6"] },
  { d: "medium", title: "Bishop Takes Rook #4", desc: "White to move. Capture the undefended rook with your bishop!", fen: "8/7B/k7/5r1K/8/8/8/8 w - - 0 1", solution: ["Bxf5"] },
  { d: "medium", title: "Knight Takes Rook #15", desc: "White to move. Capture the undefended rook with your knight!", fen: "8/8/3K3r/5N2/3k4/8/8/8 w - - 0 1", solution: ["Nxh6"] },
  { d: "medium", title: "Ladder Mate #10", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "7k/7R/4K1R1/8/8/8/8/8 w - - 0 1", solution: ["Rhh6#"] },
  { d: "medium", title: "Rook Takes Knight #13", desc: "White to move. Capture the undefended knight with your rook!", fen: "8/7K/8/2k5/8/8/8/6nR w - - 0 1", solution: ["Rxg1"] },
  { d: "medium", title: "Rook Takes Knight #15", desc: "White to move. Capture the undefended knight with your rook!", fen: "8/8/4k3/8/8/K7/5R1n/8 w - - 0 1", solution: ["Rxh2"] },
  { d: "medium", title: "Ladder Mate #2", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "K7/8/8/8/8/1R6/R7/k7 w - - 0 1", solution: ["Raa3#"] },
  { d: "medium", title: "Ladder Mate #11", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "7k/7R/7R/8/8/8/8/5K2 w - - 0 1", solution: ["Rxh8#"] },
  { d: "medium", title: "Rook Takes Knight #19", desc: "White to move. Capture the undefended knight with your rook!", fen: "8/8/8/5n2/8/2K5/5R2/k7 w - - 0 1", solution: ["Rxf5"] },
  { d: "medium", title: "Rook Takes Knight #3", desc: "White to move. Capture the undefended knight with your rook!", fen: "2k5/8/8/7K/8/7n/8/7R w - - 0 1", solution: ["Rxh3"] },
  { d: "medium", title: "Rook Takes Bishop #6", desc: "White to move. Capture the undefended bishop with your rook!", fen: "8/6R1/8/8/5K2/8/k7/6b1 w - - 0 1", solution: ["Rxg1"] },
  { d: "medium", title: "Bishop Takes Knight #15", desc: "White to move. Capture the undefended knight with your bishop!", fen: "6B1/2k5/8/8/6K1/8/n7/8 w - - 0 1", solution: ["Bxa2"] },
  { d: "medium", title: "Rook Takes Knight #18", desc: "White to move. Capture the undefended knight with your rook!", fen: "8/1k6/8/8/3K4/8/1n3R2/8 w - - 0 1", solution: ["Rxb2+"] },
  { d: "medium", title: "Knight Takes Bishop #9", desc: "White to move. Capture the undefended bishop with your knight!", fen: "K7/8/1k6/5N2/8/6b1/8/8 w - - 0 1", solution: ["Nxg3"] },
  { d: "medium", title: "Knight Takes Bishop #3", desc: "White to move. Capture the undefended bishop with your knight!", fen: "8/6N1/8/7b/8/7k/2K5/8 w - - 0 1", solution: ["Nxh5"] },
  { d: "medium", title: "Knight Takes Rook #13", desc: "White to move. Capture the undefended rook with your knight!", fen: "2K5/8/8/1k3N2/8/4r3/8/8 w - - 0 1", solution: ["Nxe3"] },
  { d: "medium", title: "Knight Takes Rook #1", desc: "White to move. Capture the undefended rook with your knight!", fen: "k1K3r1/4N3/8/8/8/8/8/8 w - - 0 1", solution: ["Nxg8"] },
  { d: "medium", title: "Knight Takes Rook #18", desc: "White to move. Capture the undefended rook with your knight!", fen: "5K2/8/2N5/8/1k1r4/8/8/8 w - - 0 1", solution: ["Nxd4"] },
  { d: "medium", title: "Bishop Takes Rook #6", desc: "White to move. Capture the undefended rook with your bishop!", fen: "6r1/7B/5k2/8/8/8/K7/8 w - - 0 1", solution: ["Bxg8"] },
  { d: "medium", title: "Rook Takes Bishop #17", desc: "White to move. Capture the undefended bishop with your rook!", fen: "8/8/4k3/6K1/8/5bR1/8/8 w - - 0 1", solution: ["Rxf3"] },
  { d: "medium", title: "Knight Takes Rook #4", desc: "White to move. Capture the undefended rook with your knight!", fen: "8/4N3/8/3r4/8/2k5/8/3K4 w - - 0 1", solution: ["Nxd5+"] },
  { d: "medium", title: "Rook Takes Bishop #3", desc: "White to move. Capture the undefended bishop with your rook!", fen: "8/6R1/8/8/8/3K4/k5b1/8 w - - 0 1", solution: ["Rxg2+"] },
  { d: "medium", title: "Knight Takes Rook #12", desc: "White to move. Capture the undefended rook with your knight!", fen: "8/4r3/1K6/5N2/8/8/7k/8 w - - 0 1", solution: ["Nxe7"] },
  { d: "medium", title: "Bishop Takes Knight #13", desc: "White to move. Capture the undefended knight with your bishop!", fen: "K5B1/8/8/8/8/1n6/5k2/8 w - - 0 1", solution: ["Bxb3"] },
  { d: "medium", title: "Knight Takes Bishop #15", desc: "White to move. Capture the undefended bishop with your knight!", fen: "8/8/8/8/4k3/7K/4N3/2b5 w - - 0 1", solution: ["Nxc1"] },
  { d: "medium", title: "Ladder Mate #7", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "8/8/8/8/8/1R4K1/3R4/7k w - - 0 1", solution: ["Rd1#"] },
  { d: "medium", title: "Knight Takes Rook #17", desc: "White to move. Capture the undefended rook with your knight!", fen: "8/4k3/8/5N2/8/6r1/2K5/8 w - - 0 1", solution: ["Nxg3"] },
  { d: "medium", title: "Bishop Takes Knight #14", desc: "White to move. Capture the undefended knight with your bishop!", fen: "6B1/5n2/8/8/8/8/5K2/k7 w - - 0 1", solution: ["Bxf7"] },
  { d: "medium", title: "Knight Takes Bishop #6", desc: "White to move. Capture the undefended bishop with your knight!", fen: "8/6b1/8/1K3N2/8/7k/8/8 w - - 0 1", solution: ["Nxg7"] },
  { d: "medium", title: "Knight Takes Rook #3", desc: "White to move. Capture the undefended rook with your knight!", fen: "k1r5/4N3/1K6/8/8/8/8/8 w - - 0 1", solution: ["Nxc8"] },
  { d: "medium", title: "Bishop Takes Rook #16", desc: "White to move. Capture the undefended rook with your bishop!", fen: "8/8/8/8/7k/5K2/1B6/r7 w - - 0 1", solution: ["Bxa1"] },
  { d: "medium", title: "Ladder Mate #19", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "1k6/1R6/1R6/6K1/8/8/8/8 w - - 0 1", solution: ["Rxb8#"] },
  { d: "medium", title: "Knight Takes Rook #2", desc: "White to move. Capture the undefended rook with your knight!", fen: "2K5/4N3/2r5/8/8/8/8/7k w - - 0 1", solution: ["Nxc6"] },
  { d: "medium", title: "Rook Takes Knight #20", desc: "White to move. Capture the undefended knight with your rook!", fen: "8/8/8/k7/8/8/1K3R2/5n2 w - - 0 1", solution: ["Rxf1"] },
  { d: "medium", title: "Rook Takes Knight #8", desc: "White to move. Capture the undefended knight with your rook!", fen: "2k5/8/8/K7/8/8/8/2n4R w - - 0 1", solution: ["Rxc1+"] },
  { d: "medium", title: "Knight Takes Bishop #5", desc: "White to move. Capture the undefended bishop with your knight!", fen: "8/2K5/8/1k3N2/8/4b3/8/8 w - - 0 1", solution: ["Nxe3"] },
  { d: "medium", title: "Rook Takes Bishop #2", desc: "White to move. Capture the undefended bishop with your rook!", fen: "8/6R1/6b1/8/8/4k3/7K/8 w - - 0 1", solution: ["Rxg6"] },
  { d: "medium", title: "Rook Takes Bishop #10", desc: "White to move. Capture the undefended bishop with your rook!", fen: "6b1/6R1/1k6/8/8/5K2/8/8 w - - 0 1", solution: ["Rxg8"] },
  { d: "medium", title: "Ladder Mate #16", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "7k/7R/6R1/8/8/K7/8/8 w - - 0 1", solution: ["Rhh6#"] },
  { d: "medium", title: "Knight Takes Bishop #10", desc: "White to move. Capture the undefended bishop with your knight!", fen: "8/4b3/8/2k2N2/8/3K4/8/8 w - - 0 1", solution: ["Nxe7"] },
  { d: "medium", title: "Bishop Takes Knight #17", desc: "White to move. Capture the undefended knight with your bishop!", fen: "k3K1B1/8/8/8/2n5/8/8/8 w - - 0 1", solution: ["Bxc4"] },
  { d: "medium", title: "Ladder Mate #13", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "8/8/8/8/8/1K1R4/4R3/2k5 w - - 0 1", solution: ["Re1#"] },
  { d: "medium", title: "Rook Takes Knight #5", desc: "White to move. Capture the undefended knight with your rook!", fen: "K7/8/1k6/8/8/8/8/3n3R w - - 0 1", solution: ["Rxd1"] },
  { d: "medium", title: "Knight Takes Bishop #11", desc: "White to move. Capture the undefended bishop with your knight!", fen: "8/8/8/5N2/7b/8/5K1k/8 w - - 0 1", solution: ["Nxh4"] },
  { d: "medium", title: "Bishop Takes Knight #20", desc: "White to move. Capture the undefended knight with your bishop!", fen: "k7/8/8/8/8/6n1/2K2B2/8 w - - 0 1", solution: ["Bxg3"] },
  { d: "medium", title: "Rook Takes Bishop #5", desc: "White to move. Capture the undefended bishop with your rook!", fen: "8/1b4R1/8/8/5K2/8/8/7k w - - 0 1", solution: ["Rxb7"] },
  { d: "medium", title: "Rook Takes Knight #14", desc: "White to move. Capture the undefended knight with your rook!", fen: "8/1K6/8/8/4k3/8/n4R2/8 w - - 0 1", solution: ["Rxa2"] },
  { d: "medium", title: "Knight Takes Bishop #14", desc: "White to move. Capture the undefended bishop with your knight!", fen: "8/8/8/8/8/k1K5/4N3/6b1 w - - 0 1", solution: ["Nxg1"] },
  { d: "medium", title: "Bishop Takes Rook #18", desc: "White to move. Capture the undefended rook with your bishop!", fen: "8/8/3r1k1K/8/8/B7/8/8 w - - 0 1", solution: ["Bxd6"] },
  { d: "medium", title: "Rook Takes Bishop #20", desc: "White to move. Capture the undefended bishop with your rook!", fen: "8/1k4b1/8/8/1K6/6R1/8/8 w - - 0 1", solution: ["Rxg7+"] },
  { d: "medium", title: "Rook Takes Knight #7", desc: "White to move. Capture the undefended knight with your rook!", fen: "8/8/8/8/8/1K6/7n/4k2R w - - 0 1", solution: ["Rxh2"] },
  { d: "medium", title: "Bishop Takes Rook #19", desc: "White to move. Capture the undefended rook with your bishop!", fen: "5r2/8/8/8/8/B7/7k/2K5 w - - 0 1", solution: ["Bxf8"] },
  { d: "medium", title: "Bishop Takes Knight #6", desc: "White to move. Capture the undefended knight with your bishop!", fen: "8/8/8/K1B5/8/n7/8/5k2 w - - 0 1", solution: ["Bxa3"] },
  { d: "medium", title: "Knight Takes Rook #7", desc: "White to move. Capture the undefended rook with your knight!", fen: "3K4/8/8/8/8/8/N3k3/2r5 w - - 0 1", solution: ["Nxc1+"] },
  { d: "medium", title: "Bishop Takes Rook #12", desc: "White to move. Capture the undefended rook with your bishop!", fen: "K6r/8/8/8/8/8/1B3k2/8 w - - 0 1", solution: ["Bxh8"] },
  { d: "medium", title: "Rook Takes Bishop #14", desc: "White to move. Capture the undefended bishop with your rook!", fen: "8/8/8/8/2K3b1/6R1/2k5/8 w - - 0 1", solution: ["Rxg4"] },
  { d: "medium", title: "Ladder Mate #4", desc: "White to move. Two rooks work together — deliver checkmate!", fen: "8/8/8/8/8/3R1K2/2R5/4k3 w - - 0 1", solution: ["Rc1#"] },
  { d: "medium", title: "Knight Takes Rook #19", desc: "White to move. Capture the undefended rook with your knight!", fen: "3r4/8/2N5/8/4K3/8/8/6k1 w - - 0 1", solution: ["Nxd8"] },
  { d: "medium", title: "Bishop Takes Rook #13", desc: "White to move. Capture the undefended rook with your bishop!", fen: "8/8/5r2/8/K7/8/1B6/6k1 w - - 0 1", solution: ["Bxf6"] },
  { d: "hard", title: "Queen Takes Rook #7", desc: "White to move. Capture the undefended rook with your queen!", fen: "8/8/5Q2/7K/5r2/8/8/4k3 w - - 0 1", solution: ["Qxf4"] },
  { d: "hard", title: "Queen Takes Knight #15", desc: "White to move. Capture the undefended knight with your queen!", fen: "3K4/8/3n4/8/5k2/Q7/8/8 w - - 0 1", solution: ["Qxd6+"] },
  { d: "hard", title: "Queen Takes Bishop #2", desc: "White to move. Capture the undefended bishop with your queen!", fen: "b7/Q7/8/8/8/6K1/8/1k6 w - - 0 1", solution: ["Qxa8"] },
  { d: "hard", title: "Queen Takes Knight #6", desc: "White to move. Capture the undefended knight with your queen!", fen: "8/8/4k3/8/8/Q3n3/6K1/8 w - - 0 1", solution: ["Qxe3+"] },
  { d: "hard", title: "Queen Takes Rook #6", desc: "White to move. Capture the undefended rook with your queen!", fen: "4K3/8/5Q1r/8/8/8/8/6k1 w - - 0 1", solution: ["Qxh6"] },
  { d: "hard", title: "Queen Takes Rook #9", desc: "White to move. Capture the undefended rook with your queen!", fen: "5r2/8/5Q2/8/3K4/8/8/2k5 w - - 0 1", solution: ["Qxf8"] },
  { d: "hard", title: "Queen Takes Bishop #7", desc: "White to move. Capture the undefended bishop with your queen!", fen: "8/Q7/8/2b5/7k/8/2K5/8 w - - 0 1", solution: ["Qxc5"] },
  { d: "hard", title: "Queen Takes Bishop #10", desc: "White to move. Capture the undefended bishop with your queen!", fen: "8/Q7/3K4/7k/8/8/8/6b1 w - - 0 1", solution: ["Qxg1"] },
  { d: "hard", title: "Queen Takes Rook #4", desc: "White to move. Capture the undefended rook with your queen!", fen: "2K5/8/1r3Q2/8/1k6/8/8/8 w - - 0 1", solution: ["Qxb6+"] },
  { d: "hard", title: "Queen Takes Rook #8", desc: "White to move. Capture the undefended rook with your queen!", fen: "3r4/8/5Q2/8/8/6K1/8/3k4 w - - 0 1", solution: ["Qxd8+"] },
  { d: "hard", title: "Queen Takes Bishop #5", desc: "White to move. Capture the undefended bishop with your queen!", fen: "8/Q7/b7/8/2k5/5K2/8/8 w - - 0 1", solution: ["Qxa6+"] },
  { d: "hard", title: "Queen Takes Rook #2", desc: "White to move. Capture the undefended rook with your queen!", fen: "8/8/3K1Q2/6r1/8/8/8/3k4 w - - 0 1", solution: ["Qxg5"] },
  { d: "hard", title: "Queen Takes Rook #15", desc: "White to move. Capture the undefended rook with your queen!", fen: "5k2/8/2r2Q2/8/8/5K2/8/8 w - - 0 1", solution: ["Qxc6"] },
  { d: "hard", title: "Queen Takes Knight #1", desc: "White to move. Capture the undefended knight with your queen!", fen: "8/2K5/8/8/8/Q3k3/1n6/8 w - - 0 1", solution: ["Qxb2"] },
  { d: "hard", title: "Queen Takes Rook #5", desc: "White to move. Capture the undefended rook with your queen!", fen: "7r/8/5Q2/8/8/8/3K4/1k6 w - - 0 1", solution: ["Qxh8"] },
  { d: "hard", title: "Queen Takes Knight #10", desc: "White to move. Capture the undefended knight with your queen!", fen: "8/4n3/8/8/8/Q7/2k1K3/8 w - - 0 1", solution: ["Qxe7"] },
  { d: "hard", title: "Queen Takes Bishop #1", desc: "White to move. Capture the undefended bishop with your queen!", fen: "8/Q1b5/7k/8/8/8/8/K7 w - - 0 1", solution: ["Qxc7"] },
  { d: "hard", title: "Queen Takes Knight #9", desc: "White to move. Capture the undefended knight with your queen!", fen: "1k6/8/6K1/8/8/Q5n1/8/8 w - - 0 1", solution: ["Qxg3+"] },
  { d: "hard", title: "Queen Takes Bishop #9", desc: "White to move. Capture the undefended bishop with your queen!", fen: "8/Q7/2K5/8/8/8/b5k1/8 w - - 0 1", solution: ["Qxa2+"] },
  { d: "hard", title: "Queen Takes Bishop #3", desc: "White to move. Capture the undefended bishop with your queen!", fen: "8/Q2k4/8/2K5/b7/8/8/8 w - - 0 1", solution: ["Qxa4+"] },
  { d: "hard", title: "Queen Takes Knight #5", desc: "White to move. Capture the undefended knight with your queen!", fen: "3k4/n7/5K2/8/8/Q7/8/8 w - - 0 1", solution: ["Qxa7"] },
  { d: "hard", title: "Queen Takes Rook #3", desc: "White to move. Capture the undefended rook with your queen!", fen: "8/8/5Q2/8/8/8/3k1r2/1K6 w - - 0 1", solution: ["Qxf2+"] },
  { d: "hard", title: "Queen Takes Knight #14", desc: "White to move. Capture the undefended knight with your queen!", fen: "8/3K4/8/7k/8/Qn6/8/8 w - - 0 1", solution: ["Qxb3"] },
  { d: "hard", title: "Queen Takes Bishop #13", desc: "White to move. Capture the undefended bishop with your queen!", fen: "4K3/Q6b/8/8/k7/8/8/8 w - - 0 1", solution: ["Qxh7"] },
  { d: "hard", title: "Queen Takes Bishop #6", desc: "White to move. Capture the undefended bishop with your queen!", fen: "8/Q4b2/8/8/3k1K2/8/8/8 w - - 0 1", solution: ["Qxf7"] },
  { d: "hard", title: "Queen Takes Rook #10", desc: "White to move. Capture the undefended rook with your queen!", fen: "8/7k/3r1Q2/8/3K4/8/8/8 w - - 0 1", solution: ["Qxd6"] },
  { d: "hard", title: "Queen Takes Rook #14", desc: "White to move. Capture the undefended rook with your queen!", fen: "4k3/8/r4Q2/8/8/6K1/8/8 w - - 0 1", solution: ["Qxa6"] },
  { d: "hard", title: "Queen Takes Knight #12", desc: "White to move. Capture the undefended knight with your queen!", fen: "8/8/3K4/1k6/8/Q2n4/8/8 w - - 0 1", solution: ["Qxd3+"] },
  { d: "hard", title: "Queen Takes Bishop #12", desc: "White to move. Capture the undefended bishop with your queen!", fen: "8/Q2b4/8/8/5k2/3K4/8/8 w - - 0 1", solution: ["Qxd7"] },
  { d: "hard", title: "Queen Takes Rook #11", desc: "White to move. Capture the undefended rook with your queen!", fen: "3K4/k7/4rQ2/8/8/8/8/8 w - - 0 1", solution: ["Qxe6"] },
  { d: "hard", title: "Queen Takes Bishop #15", desc: "White to move. Capture the undefended bishop with your queen!", fen: "8/Q7/2k5/8/6K1/8/8/b7 w - - 0 1", solution: ["Qxa1"] },
  { d: "hard", title: "Queen Takes Knight #2", desc: "White to move. Capture the undefended knight with your queen!", fen: "8/4k3/8/2n3K1/8/Q7/8/8 w - - 0 1", solution: ["Qxc5+"] },
  { d: "hard", title: "Queen Takes Knight #3", desc: "White to move. Capture the undefended knight with your queen!", fen: "8/1k6/8/8/n7/Q6K/8/8 w - - 0 1", solution: ["Qxa4"] },
  { d: "hard", title: "Queen Takes Knight #8", desc: "White to move. Capture the undefended knight with your queen!", fen: "4K3/1k6/8/n7/8/Q7/8/8 w - - 0 1", solution: ["Qxa5"] },
  { d: "hard", title: "Queen Takes Bishop #14", desc: "White to move. Capture the undefended bishop with your queen!", fen: "4k3/Q7/7K/8/8/8/5b2/8 w - - 0 1", solution: ["Qxf2"] },
  { d: "hard", title: "Queen Takes Bishop #8", desc: "White to move. Capture the undefended bishop with your queen!", fen: "8/Q7/8/b7/8/8/7K/3k4 w - - 0 1", solution: ["Qxa5"] },
  { d: "hard", title: "Queen Takes Bishop #4", desc: "White to move. Capture the undefended bishop with your queen!", fen: "8/Q7/1b6/8/2k5/6K1/8/8 w - - 0 1", solution: ["Qxb6"] },
  { d: "hard", title: "Queen Takes Rook #1", desc: "White to move. Capture the undefended rook with your queen!", fen: "8/8/K4Q2/8/k6r/8/8/8 w - - 0 1", solution: ["Qxh4+"] },
  { d: "hard", title: "Queen Takes Knight #4", desc: "White to move. Capture the undefended knight with your queen!", fen: "8/7k/8/8/8/Q4n2/8/K7 w - - 0 1", solution: ["Qxf3"] },
  { d: "hard", title: "Queen Takes Rook #12", desc: "White to move. Capture the undefended rook with your queen!", fen: "8/8/K4Q2/8/2k5/8/8/r7 w - - 0 1", solution: ["Qxa1"] },
  { d: "hard", title: "Queen Takes Bishop #11", desc: "White to move. Capture the undefended bishop with your queen!", fen: "6K1/Qb6/8/8/5k2/8/8/8 w - - 0 1", solution: ["Qxb7"] },
  { d: "hard", title: "Queen Takes Knight #7", desc: "White to move. Capture the undefended knight with your queen!", fen: "8/8/k7/2K5/8/Q6n/8/8 w - - 0 1", solution: ["Qxh3"] },
  { d: "hard", title: "Queen Takes Knight #13", desc: "White to move. Capture the undefended knight with your queen!", fen: "8/8/8/8/1n6/Q2K4/8/4k3 w - - 0 1", solution: ["Qxb4+"] },
  { d: "hard", title: "Queen Takes Knight #11", desc: "White to move. Capture the undefended knight with your queen!", fen: "8/3k4/8/1K6/8/Q7/8/2n5 w - - 0 1", solution: ["Qxc1"] },
  { d: "hard", title: "Queen Takes Rook #13", desc: "White to move. Capture the undefended rook with your queen!", fen: "5k2/1K6/5Q2/5r2/8/8/8/8 w - - 0 1", solution: ["Qxf5+"] },
];

const DIFF_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" };

let puzzleGame;
let puzzleBoard;
let currentDifficulty = "all";
let shuffleBag = [];
let currentPuzzle = null;
let streak = 0;
let bestStreak = 0;
let solvedCount = 0;

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
  updateCurrentProfile((p) => {
    p.streak = streak;
    p.bestStreak = bestStreak;
    p.solvedCount = solvedCount;
  });
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

/* ---------- Boot: require a profile before play ---------- */
if (!getCurrentProfile()) {
  openModal(false);
} else {
  refreshProfileUI();
}
