const boardSize = 8;
const tileSize = 60;
const types = 6;
const maxMoves = 30;

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreNode = document.getElementById("score");
const movesNode = document.getElementById("moves");
const statusNode = document.getElementById("status");
const restartBtn = document.getElementById("restart");

const gemSprites = Array.from({ length: types }, (_, i) => {
  const img = new Image();
  img.src = `assets/gem-${i + 1}.svg`;
  return img;
});

let board = [];
let score = 0;
let moves = maxMoves;
let selected = null;
let busy = false;

function randGem() {
  return Math.floor(Math.random() * types);
}

function createBoard() {
  board = Array.from({ length: boardSize }, () => Array.from({ length: boardSize }, randGem));
  while (findMatches().length) {
    board.forEach((row, y) => {
      row.forEach((_, x) => {
        if (isPartOfMatch(x, y)) board[y][x] = randGem();
      });
    });
  }
}

function isPartOfMatch(x, y) {
  const v = board[y][x];
  return (
    (x >= 2 && board[y][x - 1] === v && board[y][x - 2] === v) ||
    (x <= boardSize - 3 && board[y][x + 1] === v && board[y][x + 2] === v) ||
    (y >= 2 && board[y - 1][x] === v && board[y - 2][x] === v) ||
    (y <= boardSize - 3 && board[y + 1][x] === v && board[y + 2][x] === v)
  );
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const px = x * tileSize;
      const py = y * tileSize;
      ctx.fillStyle = (x + y) % 2 ? "#111739" : "#0d1331";
      ctx.fillRect(px, py, tileSize, tileSize);

      const gem = board[y][x];
      const image = gemSprites[gem];
      ctx.drawImage(image, px + 7, py + 7, tileSize - 14, tileSize - 14);

      if (selected && selected.x === x && selected.y === y) {
        ctx.strokeStyle = "#8ff2ff";
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 3, py + 3, tileSize - 6, tileSize - 6);
      }
    }
  }
}

function findMatches() {
  const matches = new Set();

  for (let y = 0; y < boardSize; y++) {
    let streak = 1;
    for (let x = 1; x <= boardSize; x++) {
      if (x < boardSize && board[y][x] === board[y][x - 1]) {
        streak++;
      } else {
        if (streak >= 3) {
          for (let k = 0; k < streak; k++) matches.add(`${x - 1 - k},${y}`);
        }
        streak = 1;
      }
    }
  }

  for (let x = 0; x < boardSize; x++) {
    let streak = 1;
    for (let y = 1; y <= boardSize; y++) {
      if (y < boardSize && board[y][x] === board[y - 1][x]) {
        streak++;
      } else {
        if (streak >= 3) {
          for (let k = 0; k < streak; k++) matches.add(`${x},${y - 1 - k}`);
        }
        streak = 1;
      }
    }
  }

  return [...matches].map((id) => {
    const [x, y] = id.split(",").map(Number);
    return { x, y };
  });
}

function swap(a, b) {
  const temp = board[a.y][a.x];
  board[a.y][a.x] = board[b.y][b.x];
  board[b.y][b.x] = temp;
}

function adjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

function collapse(matches) {
  for (const { x, y } of matches) board[y][x] = null;

  for (let x = 0; x < boardSize; x++) {
    let write = boardSize - 1;
    for (let y = boardSize - 1; y >= 0; y--) {
      if (board[y][x] !== null) {
        board[write][x] = board[y][x];
        write--;
      }
    }
    while (write >= 0) {
      board[write][x] = randGem();
      write--;
    }
  }
}

async function resolveBoard() {
  let chain = 0;
  while (true) {
    const matches = findMatches();
    if (!matches.length) break;
    chain++;
    score += matches.length * 10 * chain;
    collapse(matches);
    updateHud();
    draw();
    await new Promise((r) => setTimeout(r, 150));
  }
}

function updateHud() {
  scoreNode.textContent = String(score);
  movesNode.textContent = String(moves);
}

function setStatus(message) {
  statusNode.textContent = message;
}

async function onTap(evt) {
  if (busy || moves <= 0) return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((evt.clientX - rect.left) / rect.width) * boardSize);
  const y = Math.floor(((evt.clientY - rect.top) / rect.height) * boardSize);
  if (x < 0 || y < 0 || x >= boardSize || y >= boardSize) return;

  if (!selected) {
    selected = { x, y };
    draw();
    return;
  }

  const next = { x, y };
  if (!adjacent(selected, next)) {
    selected = next;
    draw();
    return;
  }

  busy = true;
  swap(selected, next);
  draw();

  const matches = findMatches();
  if (!matches.length) {
    swap(selected, next);
    setStatus("その手は無効！3つ以上揃うように動かしてみよう。");
  } else {
    moves--;
    setStatus("Nice! 連鎖を狙って高得点を目指そう。");
    await resolveBoard();
  }

  selected = null;
  updateHud();
  draw();
  if (moves <= 0) setStatus(`ゲーム終了！スコア: ${score}`);
  busy = false;
}

function reset() {
  score = 0;
  moves = maxMoves;
  selected = null;
  busy = false;
  createBoard();
  updateHud();
  setStatus("隣り合うジェムを入れ替えて、3つ以上揃えよう！");
  draw();
}

canvas.addEventListener("pointerdown", onTap);
restartBtn.addEventListener("click", reset);

Promise.all(gemSprites.map((img) => img.decode().catch(() => null))).finally(reset);
