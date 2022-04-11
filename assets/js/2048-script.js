import Grid from "./2048-Grid.js";
import Tile from "./2048-Tile.js";
// import InputHandler from "./game-InputHandler.js";

const gameBoard = document.getElementById("game-board");
const scoreAmountElem = document.querySelector("[data-score-amount]");
const bestScoreAmountElem = document.querySelector("[data-best-score-amount]");

const grid = new Grid(gameBoard);
grid.randomEmptyCell().tile = new Tile(gameBoard);
grid.randomEmptyCell().tile = new Tile(gameBoard);
setupInput();
showScore();

const bestScore = localStorage.getItem("bestScore");
if (bestScore == null || bestScore == undefined) {
  localStorage.setItem("bestScore", 0);
} else {
  bestScoreAmountElem.textContent = bestScore;
}

function setupInput() {
  window.addEventListener("keydown", handleInput, { once: true });
  gameBoard.addEventListener("touchstart", handleTouchStart, {
    once: true,
    passive: false,
  });
}

async function handleInput(e) {
  switch (e.key) {
    case "ArrowUp":
      if (!canMoveUp()) {
        setupInput();
        return;
      }
      await moveUp();
      break;
    case "ArrowDown":
      if (!canMoveDown()) {
        setupInput();
        return;
      }
      await moveDown();
      break;
    case "ArrowLeft":
      if (!canMoveLeft()) {
        setupInput();
        return;
      }
      await moveLeft();
      break;
    case "ArrowRight":
      if (!canMoveRight()) {
        setupInput();
        return;
      }
      await moveRight();
      break;
    default:
      setupInput();
      return;
  }

  grid.cells.forEach((cell) => cell.mergeTiles());

  const newTile = new Tile(gameBoard);
  grid.randomEmptyCell().tile = newTile;

  if (!canMoveUp() && !canMoveDown() && !canMoveLeft() && !canMoveRight()) {
    newTile.waitForTransition(true).then(() => {
      /*=============== SHOW MODAL ===============*/
      const modalContainer = document.getElementById("modal-container-lose");
      modalContainer.classList.add("show-modal");

      // alert("Game Over");
    });
    return;
  }

  setupInput();
}

async function handleTouchStart(e) {
  const startTouchData = e.changedTouches[0];

  gameBoard.addEventListener("touchmove", handleTouchMove, {
    passive: false,
  });
  gameBoard.addEventListener(
    "touchend",
    async (e) => {
      e.preventDefault();
      gameBoard.removeEventListener("touchmove", handleTouchMove);

      const endTouchData = e.changedTouches[0];

      const distanceX = endTouchData.pageX - startTouchData.pageX;
      const distanceY = endTouchData.pageY - startTouchData.pageY;

      const THRESHOLD_DISTANCE = 75;

      if (Math.abs(distanceX) >= THRESHOLD_DISTANCE) {
        if ((await distanceX) > 0) {
          if (!canMoveRight()) {
            setupInput();
            return;
          }
          await moveRight();
        } else {
          if (!canMoveLeft()) {
            setupInput();
            return;
          }
          await moveLeft();
        }

        //
        grid.cells.forEach((cell) => cell.mergeTiles());

        const newTile = new Tile(gameBoard);
        grid.randomEmptyCell().tile = newTile;

        if (
          !canMoveUp() &&
          !canMoveDown() &&
          !canMoveLeft() &&
          !canMoveRight()
        ) {
          newTile.waitForTransition(true).then(() => {
            /*=============== SHOW MODAL ===============*/
            const modalContainer = document.getElementById(
              "modal-container-lose"
            );
            modalContainer.classList.add("show-modal");
          });
          return;
        }
      } else if (Math.abs(distanceY) >= THRESHOLD_DISTANCE) {
        if ((await distanceY) > 0) {
          if (!canMoveDown()) {
            setupInput();
            return;
          }
          await moveDown();
        } else {
          if (!canMoveUp()) {
            setupInput();
            return;
          }
          await moveUp();
        }

        //

        grid.cells.forEach((cell) => cell.mergeTiles());

        const newTile = new Tile(gameBoard);
        grid.randomEmptyCell().tile = newTile;

        if (
          !canMoveUp() &&
          !canMoveDown() &&
          !canMoveLeft() &&
          !canMoveRight()
        ) {
          newTile.waitForTransition(true).then(() => {
            /*=============== SHOW MODAL ===============*/
            const modalContainer = document.getElementById(
              "modal-container-lose"
            );
            modalContainer.classList.add("show-modal");
          });
          return;
        }
      }
      setupInput();
    },
    { once: true }
  );
}

function handleTouchMove(e) {
  e.preventDefault();
}

function moveUp() {
  return slideTiles(grid.cellsByColumn);
}

function moveDown() {
  return slideTiles(grid.cellsByColumn.map((column) => [...column].reverse()));
}

function moveLeft() {
  return slideTiles(grid.cellsByRow);
}

function moveRight() {
  return slideTiles(grid.cellsByRow.map((row) => [...row].reverse()));
}

async function slideTiles(cells) {
  await Promise.all(
    cells.flatMap((group) => {
      const promises = [];
      for (let i = 1; i < group.length; i++) {
        const cell = group[i];
        if (cell.tile == null) continue;
        let lastValidCell;
        for (let j = i - 1; j >= 0; j--) {
          const moveToCell = group[j];
          if (!moveToCell.canAccept(cell.tile)) break;
          lastValidCell = moveToCell;
        }

        if (lastValidCell != null) {
          promises.push(cell.tile.waitForTransition());
          if (lastValidCell.tile != null) {
            lastValidCell.mergeTile = cell.tile;
          } else {
            lastValidCell.tile = cell.tile;
          }
          cell.tile = null;
        }
      }
      return promises;
    })
  );

  const additionalScore = grid.cells.reduce((sum, cell) => {
    if (cell.mergeTile == null || cell.tile == null) return sum;
    return sum + cell.mergeTile.value + cell.tile.value;
  }, 0);

  grid.cells.forEach((cell) => cell.mergeTiles());

  if (additionalScore > 0) {
    showScore(additionalScore);
  }

  return additionalScore;
}

function canMoveUp() {
  return canMove(grid.cellsByColumn);
}

function canMoveDown() {
  return canMove(grid.cellsByColumn.map((column) => [...column].reverse()));
}

function canMoveLeft() {
  return canMove(grid.cellsByRow);
}

function canMoveRight() {
  return canMove(grid.cellsByRow.map((row) => [...row].reverse()));
}

function canMove(cells) {
  return cells.some((group) => {
    return group.some((cell, index) => {
      if (index === 0) return false;
      if (cell.tile == null) return false;
      const moveToCell = group[index - 1];
      return moveToCell.canAccept(cell.tile);
    });
  });
}

function showScore(additionalScore) {
  if (additionalScore != null) {
    const currentScore = scoreAmountElem.textContent;
    const score = +currentScore + +additionalScore;
    scoreAmountElem.textContent = score;
    showBestScore(score);
  }
}

function showBestScore(score) {
  const bestScore = localStorage.getItem("bestScore");

  if (bestScore == null || bestScore == undefined || bestScore <= score) {
    bestScoreAmountElem.textContent = score;
    localStorage.setItem("bestScore", score);
    return;
  }
}

/*=============== CLOSE MODAL ===============*/
const closeBtn = document.querySelectorAll(".close-modal");

function closeModal() {
  const modalContainer = document.getElementById("modal-container-lose");
  modalContainer.classList.remove("show-modal");
}
closeBtn.forEach((c) => c.addEventListener("click", closeModal));
