(() => {
  "use strict";

  const BOARD_X = 28;
  const BOARD_Y = 14;

  const Direction = Object.freeze({
    STOP: "STOP",
    LEFT: "LEFT",
    RIGHT: "RIGHT",
    UP: "UP",
    DOWN: "DOWN"
  });

  const SPEEDS = Object.freeze({
    1: 500,
    2: 350,
    3: 200,
    4: 100,
    5: 50
  });

  const OPPOSITE = Object.freeze({
    LEFT: Direction.RIGHT,
    RIGHT: Direction.LEFT,
    UP: Direction.DOWN,
    DOWN: Direction.UP
  });

  class GameMechs {
    constructor(boardX = BOARD_X, boardY = BOARD_Y) {
      this.boardSizeX = boardX;
      this.boardSizeY = boardY;
      this.score = 0;
      this.loseFlag = false;
      this.gameMsg = "";
      this.gameMsgUntil = 0;
    }

    incrementScore(amount) {
      this.score += amount;
    }

    setMessage(message, duration = 800) {
      this.gameMsg = message;
      this.gameMsgUntil = performance.now() + duration;
    }

    currentMessage() {
      if (performance.now() <= this.gameMsgUntil) return this.gameMsg;
      this.gameMsg = "";
      return "";
    }
  }

  class Player {
    constructor(game) {
      this.game = game;
      this.direction = Direction.STOP;
      this.growthBy = 0;
      this.speedLevel = 4;

      this.positions = [{
        x: Math.floor(game.boardSizeX / 2),
        y: Math.floor(game.boardSizeY / 2),
        symbol: "*"
      }];
    }

    setDirection(nextDirection) {
      if (this.game.loseFlag) return;

      if (
        this.direction !== Direction.STOP &&
        OPPOSITE[this.direction] === nextDirection
      ) {
        return;
      }

      this.direction = nextDirection;
    }

    changeSpeed(delta) {
      this.speedLevel = Math.max(1, Math.min(5, this.speedLevel + delta));
    }

    increasePlayerLength(growth) {
      this.growthBy = growth;
    }

    movePlayer() {
      if (this.direction === Direction.STOP || this.game.loseFlag) return false;

      const currentHead = this.positions[0];
      let newX = currentHead.x;
      let newY = currentHead.y;

      switch (this.direction) {
        case Direction.UP:
          newY = newY > 1 ? newY - 1 : this.game.boardSizeY - 2;
          break;

        case Direction.DOWN:
          newY = newY < this.game.boardSizeY - 2 ? newY + 1 : 1;
          break;

        case Direction.LEFT:
          newX = newX > 1 ? newX - 1 : this.game.boardSizeX - 2;
          break;

        case Direction.RIGHT:
          newX = newX < this.game.boardSizeX - 2 ? newX + 1 : 1;
          break;
      }

      this.positions.unshift({
        x: newX,
        y: newY,
        symbol: currentHead.symbol
      });

      if (this.growthBy <= 0) {
        this.positions.pop();
      } else {
        this.growthBy--;
      }

      return true;
    }

    checkSelfCollision() {
      const head = this.positions[0];

      return this.positions
        .slice(1)
        .some(segment => segment.x === head.x && segment.y === head.y);
    }
  }

  class Food {
    constructor(game) {
      this.game = game;
      this.items = [];
    }

    positionOccupied(x, y, snake, foods) {
      const onSnake = snake.some(p => p.x === x && p.y === y);
      const onFood = foods.some(p => p.x === x && p.y === y);
      return onSnake || onFood;
    }

    tooCloseToHead(x, y, snake) {
      const head = snake[0];


      return Math.abs(x - head.x) <= 3 && Math.abs(y - head.y) <= 3;
    }

    generateFood(snake) {
      const symbols = ["o", "o", "o", "0", "+"];
      const generated = [];

      for (const symbol of symbols) {
        let attempts = 0;
        let candidate;

        do {
          candidate = {
            x: Math.floor(Math.random() * (this.game.boardSizeX - 3)) + 1,
            y: Math.floor(Math.random() * (this.game.boardSizeY - 3)) + 1,
            symbol
          };
          attempts++;
        } while (
          attempts < 500 &&
          (
            this.positionOccupied(candidate.x, candidate.y, snake, generated) ||
            this.tooCloseToHead(candidate.x, candidate.y, snake)
          )
        );

        generated.push(candidate);
      }

      this.items = generated;
    }

    foodAt(x, y) {
      return this.items.find(item => item.x === x && item.y === y);
    }
  }

  class SnakeGame {
    constructor(screen, root) {
      this.screen = screen;
      this.root = root;
      this.timer = null;

      this.restart();
    }

    restart() {
      clearTimeout(this.timer);

      this.game = new GameMechs();
      this.player = new Player(this.game);
      this.food = new Food(this.game);
      this.food.generateFood(this.player.positions);
      this.gameOverEventSent = false;

      this.render();
      this.scheduleNextTick();
      this.root.focus({ preventScroll: true });
    }

    scheduleNextTick() {
      clearTimeout(this.timer);

      this.timer = setTimeout(() => {
        this.tick();
        this.scheduleNextTick();
      }, SPEEDS[this.player.speedLevel]);
    }

    tick() {
      if (this.game.loseFlag) {
        this.render();
        return;
      }

      const moved = this.player.movePlayer();

      if (moved) {
        const head = this.player.positions[0];
        const consumed = this.food.foodAt(head.x, head.y);

        if (consumed) {
          if (consumed.symbol === "0") {
            this.game.incrementScore(30);
            this.player.increasePlayerLength(0);
            this.game.setMessage("+30 score! +0 length!");
          } else if (consumed.symbol === "+") {
            this.game.incrementScore(50);
            this.player.increasePlayerLength(5);
            this.game.setMessage("+50 score! +5 length!");
          } else {
            this.game.incrementScore(10);
            this.player.increasePlayerLength(1);
            this.game.setMessage("+10 score! +1 length!");
          }

          this.food.generateFood(this.player.positions);
        }

        if (this.player.checkSelfCollision()) {
          this.game.loseFlag = true;
        }
      }

      this.render();
    }

    handleDirection(direction) {
      this.player.setDirection(direction);
      this.render();
    }

    handleKey(event) {
      const key = event.key;
      const lower = key.toLowerCase();

      const directionMap = {
        w: Direction.UP,
        arrowup: Direction.UP,
        s: Direction.DOWN,
        arrowdown: Direction.DOWN,
        a: Direction.LEFT,
        arrowleft: Direction.LEFT,
        d: Direction.RIGHT,
        arrowright: Direction.RIGHT
      };

      if (directionMap[lower]) {
        event.preventDefault();
        this.handleDirection(directionMap[lower]);
        return;
      }

      if (key === "<" || key === ",") {
        event.preventDefault();
        this.player.changeSpeed(-1);
        this.render();
        this.scheduleNextTick();
        return;
      }

      if (key === ">" || key === ".") {
        event.preventDefault();
        this.player.changeSpeed(1);
        this.render();
        this.scheduleNextTick();
        return;
      }

      if (lower === "n") {
        event.preventDefault();
        this.food.generateFood(this.player.positions);
        this.render();
        return;
      }

      if (lower === "r" && this.game.loseFlag) {
        event.preventDefault();
        this.restart();
      }
    }

    buildBoard() {
      const rows = [];
      const snakeLookup = new Map();

      this.player.positions.forEach((pos, index) => {
        snakeLookup.set(`${pos.x},${pos.y}`, index === 0 ? "@" : pos.symbol);
      });

      const foodLookup = new Map(
        this.food.items.map(item => [`${item.x},${item.y}`, item.symbol])
      );

      for (let y = 0; y < this.game.boardSizeY; y++) {
        let row = "";

        for (let x = 0; x < this.game.boardSizeX; x++) {
          const key = `${x},${y}`;

          if (snakeLookup.has(key)) {
            row += snakeLookup.get(key);
          } else if (foodLookup.has(key)) {
            row += foodLookup.get(key);
          } else if (
            y === 0 ||
            y === this.game.boardSizeY - 1 ||
            x === 0 ||
            x === this.game.boardSizeX - 1
          ) {
            row += "#";
          } else {
            row += " ";
          }
        }

        const msg = this.game.currentMessage();
        if (y === 5 && msg) {
          row += `   ${msg}`;
        }

        rows.push(row);
      }

      return rows.join("\n");
    }

    render() {
      const board = this.buildBoard();

      if (this.game.loseFlag) {
        this.screen.textContent =
          `${board}\n` +
          `Self collision occurred! You lose.\n` +
          `Your final score is: ${this.game.score}\n\n` +
          `Press r or click Restart to play again.`;

        if (!this.gameOverEventSent) {
          this.gameOverEventSent = true;

          window.dispatchEvent(
            new CustomEvent("snake:gameover", {
              detail: { score: this.game.score }
            })
          );
        }

        return;
      }

      const delay = (SPEEDS[this.player.speedLevel] / 1000).toFixed(3);

      this.screen.textContent =
        `${board}\n` +
        `Score: ${this.game.score}\n` +
        `Game Speed: ${this.player.speedLevel} (${delay} second delay)\n\n` +
        `Use WASD or arrow keys to move\n` +
        `Press < or > to change Game Speed\n` +
        `Press n to generate new food`;
    }
  }

  const screen = document.getElementById("snake-screen");
  const root = document.getElementById("snake-game");
  const restart = document.getElementById("snake-restart");

  if (!screen || !root || !restart) return;

  const snakeGame = new SnakeGame(screen, root);

  document.addEventListener("keydown", (event) => {
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLSelectElement
  ) {
    return;
  }

  snakeGame.handleKey(event);
});

  restart.addEventListener("click", () => snakeGame.restart());

  document.querySelectorAll("[data-dir]").forEach(button => {
    button.addEventListener("click", () => {
      snakeGame.handleDirection(button.dataset.dir);
      root.focus({ preventScroll: true });
    });
  });
  
const closeButton = document.getElementById("terminal-close");
const minimizeButton = document.getElementById("terminal-minimize");
const maximizeButton = document.getElementById("terminal-maximize");
const terminalWindow = document.querySelector(".snake-terminal");

const closeDialog = document.getElementById("close-dialog");
const cancelClose = document.getElementById("cancel-close");
const confirmClose = document.getElementById("confirm-close");

closeButton?.addEventListener("click", () => {
  closeDialog.hidden = false;
  cancelClose.focus();
});

cancelClose?.addEventListener("click", () => {
  closeDialog.hidden = true;
});

confirmClose?.addEventListener("click", () => {
  window.location.href = "/";
});

minimizeButton?.addEventListener("click", () => {
  terminalWindow.classList.remove("is-large");
  terminalWindow.classList.add("is-compact");
});

maximizeButton?.addEventListener("click", () => {
  terminalWindow.classList.remove("is-compact");
  terminalWindow.classList.add("is-large");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !closeDialog.hidden) {
    closeDialog.hidden = true;
    closeButton.focus();
  }
});

  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");

  function setTheme(isDark) {
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);

    if (themeIcon) {
      themeIcon.textContent = isDark ? "☀︎" : "☾";
    }

    if (themeToggle) {
      themeToggle.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
      );
    }
  }

  const savedTheme = localStorage.getItem("theme");
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

  if (savedTheme === "dark" || savedTheme === "light") {
    setTheme(savedTheme === "dark");
  } else {
    setTheme(systemTheme.matches);
  }

  systemTheme.addEventListener("change", (event) => {
    if (!localStorage.getItem("theme")) {
      setTheme(event.matches);
    }
  });

  themeToggle?.addEventListener("click", () => {
    const nextIsDark = !document.body.classList.contains("dark");

    setTheme(nextIsDark);
    localStorage.setItem("theme", nextIsDark ? "dark" : "light");
  });

})();
