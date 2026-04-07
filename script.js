(() => {
  const SYMBOL_POOL = [
    "🐶", "🍕", "🚗", "🎮", "⭐", "🍎", "🌈", "🦋",
    "🎵", "🚀", "🌻", "🍩", "⚽", "🧩", "🦄", "🍉",
    "🐱", "🎯", "🍔", "🚲", "🌙", "🎲", "🍓", "🛸",
    "🐼", "🎈", "🥕", "🏀", "🍪", "🪐", "🌵", "🎹"
  ];

  const DIFFICULTY_SETTINGS = {
    easy: { label: "Easy", size: 4, pairs: 8 },
    medium: { label: "Medium", size: 6, pairs: 18 },
    hard: { label: "Hard", size: 8, pairs: 32 }
  };

  // Centralized game state keeps the logic predictable and easy to follow.
  const state = {
    difficulty: "easy",
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    moves: 0,
    timerSeconds: 0,
    timerId: null,
    hasStarted: false,
    isBoardLocked: false,
    theme: "light"
  };

  const elements = {
    board: document.getElementById("gameBoard"),
    movesValue: document.getElementById("movesValue"),
    timerValue: document.getElementById("timerValue"),
    bestScoreValue: document.getElementById("bestScoreValue"),
    difficultySelect: document.getElementById("difficultySelect"),
    restartButton: document.getElementById("restartButton"),
    statusMessage: document.getElementById("statusMessage"),
    winModal: document.getElementById("winModal"),
    winSummary: document.getElementById("winSummary"),
    playAgainButton: document.getElementById("playAgainButton"),
    themeToggle: document.getElementById("themeToggle"),
    themeToggleIcon: document.querySelector(".theme-toggle__icon"),
    themeToggleLabel: document.querySelector(".theme-toggle__label")
  };

  function initialize() {
    loadTheme();
    attachEvents();
    startNewGame();
  }

  function attachEvents() {
    elements.difficultySelect.addEventListener("change", (event) => {
      state.difficulty = event.target.value;
      startNewGame();
    });

    elements.restartButton.addEventListener("click", startNewGame);
    elements.playAgainButton.addEventListener("click", () => {
      closeModal();
      startNewGame();
    });

    elements.themeToggle.addEventListener("click", toggleTheme);
    elements.winModal.addEventListener("click", (event) => {
      if (event.target === elements.winModal) {
        closeModal();
      }
    });
  }

  function startNewGame() {
    resetGameState();
    buildDeck();
    renderBoard();
    updateStats();
    updateBestScore();
    setStatus(`Ready for a ${DIFFICULTY_SETTINGS[state.difficulty].label.toLowerCase()} game. Flip a card to begin.`);
    closeModal();
  }

  function resetGameState() {
    stopTimer();
    state.cards = [];
    state.flippedCards = [];
    state.matchedPairs = 0;
    state.moves = 0;
    state.timerSeconds = 0;
    state.hasStarted = false;
    state.isBoardLocked = false;
  }

  function buildDeck() {
    const config = DIFFICULTY_SETTINGS[state.difficulty];
    const selectedSymbols = SYMBOL_POOL.slice(0, config.pairs);
    const deck = [...selectedSymbols, ...selectedSymbols]
      .map((symbol, index) => ({
        id: `${symbol}-${index}-${Math.random().toString(16).slice(2, 8)}`,
        symbol,
        isFlipped: false,
        isMatched: false
      }));

    state.cards = shuffle(deck);
  }

  function shuffle(items) {
    const shuffled = [...items];

    // Fisher-Yates shuffle randomizes the deck fairly.
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    return shuffled;
  }

  function renderBoard() {
    const config = DIFFICULTY_SETTINGS[state.difficulty];
    elements.board.innerHTML = "";
    elements.board.className = `game-board board-${state.difficulty}`;
    elements.board.setAttribute("aria-label", `${config.label} board with ${config.size * config.size} cards`);

    const fragment = document.createDocumentFragment();

    state.cards.forEach((card) => {
      const button = document.createElement("button");
      button.className = "memory-card";
      button.type = "button";
      button.dataset.cardId = card.id;
      button.dataset.symbol = card.symbol;
      button.setAttribute("aria-label", "Hidden memory card");

      button.innerHTML = `
        <span class="memory-card__inner">
          <span class="memory-card__face memory-card__face--back" aria-hidden="true">?</span>
          <span class="memory-card__face memory-card__face--front" aria-hidden="true">${card.symbol}</span>
        </span>
      `;

      button.addEventListener("click", () => handleCardClick(card.id));
      fragment.appendChild(button);
    });

    elements.board.appendChild(fragment);
  }

  function handleCardClick(cardId) {
    const selectedCard = state.cards.find((card) => card.id === cardId);

    if (!selectedCard || state.isBoardLocked || selectedCard.isFlipped || selectedCard.isMatched) {
      return;
    }

    if (!state.hasStarted) {
      state.hasStarted = true;
      startTimer();
      setStatus("Timer started. Keep matching pairs.");
    }

    flipCard(selectedCard);
    state.flippedCards.push(selectedCard);

    if (state.flippedCards.length === 2) {
      state.moves += 1;
      updateStats();
      checkForMatch();
    }
  }

  function flipCard(card) {
    card.isFlipped = true;
    const cardElement = findCardElement(card.id);

    if (cardElement) {
      cardElement.classList.add("is-flipped");
      cardElement.setAttribute("aria-label", `Revealed card ${card.symbol}`);
    }

    playTone(card.isMatched ? 540 : 440, 0.05, "triangle", 0.03);
  }

  function checkForMatch() {
    const [firstCard, secondCard] = state.flippedCards;

    if (!firstCard || !secondCard) {
      return;
    }

    state.isBoardLocked = true;

    if (firstCard.symbol === secondCard.symbol) {
      handleMatch(firstCard, secondCard);
      return;
    }

    handleMismatch(firstCard, secondCard);
  }

  function handleMatch(firstCard, secondCard) {
    firstCard.isMatched = true;
    secondCard.isMatched = true;
    state.matchedPairs += 1;

    [firstCard, secondCard].forEach((card) => {
      const cardElement = findCardElement(card.id);

      if (cardElement) {
        cardElement.classList.add("is-matched");
        cardElement.setAttribute("aria-label", `Matched card ${card.symbol}`);
      }
    });

    state.flippedCards = [];
    state.isBoardLocked = false;
    playTone(660, 0.12, "sine", 0.05);
    setStatus("Great match. Keep going.");

    if (state.matchedPairs === DIFFICULTY_SETTINGS[state.difficulty].pairs) {
      finishGame();
    }
  }

  function handleMismatch(firstCard, secondCard) {
    setStatus("Not a match. Try to remember their positions.");
    playTone(240, 0.14, "sawtooth", 0.03);

    window.setTimeout(() => {
      [firstCard, secondCard].forEach((card) => {
        card.isFlipped = false;
        const cardElement = findCardElement(card.id);

        if (cardElement) {
          cardElement.classList.remove("is-flipped");
          cardElement.setAttribute("aria-label", "Hidden memory card");
        }
      });

      state.flippedCards = [];
      state.isBoardLocked = false;
    }, 1000);
  }

  function finishGame() {
    stopTimer();
    saveBestScore();
    updateBestScore();
    setStatus("Board cleared. Open the results and go again.");
    playTone(523.25, 0.12, "triangle", 0.05);

    window.setTimeout(() => playTone(659.25, 0.12, "triangle", 0.05), 120);
    window.setTimeout(() => playTone(783.99, 0.18, "triangle", 0.05), 240);

    const difficultyLabel = DIFFICULTY_SETTINGS[state.difficulty].label;
    elements.winSummary.textContent =
      `You completed the ${difficultyLabel.toLowerCase()} board in ${formatTime(state.timerSeconds)} using ${state.moves} moves.`;
    elements.winModal.classList.remove("hidden");
  }

  function updateStats() {
    elements.movesValue.textContent = String(state.moves);
    elements.timerValue.textContent = formatTime(state.timerSeconds);
  }

  function setStatus(message) {
    elements.statusMessage.textContent = message;
  }

  function startTimer() {
    stopTimer();
    state.timerId = window.setInterval(() => {
      state.timerSeconds += 1;
      updateStats();
    }, 1000);
  }

  function stopTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function saveBestScore() {
    const key = getBestScoreKey();
    const currentBest = readBestScore();
    const currentResult = {
      moves: state.moves,
      time: state.timerSeconds
    };

    const shouldSave =
      !currentBest ||
      currentResult.moves < currentBest.moves ||
      (currentResult.moves === currentBest.moves && currentResult.time < currentBest.time);

    if (shouldSave) {
      localStorage.setItem(key, JSON.stringify(currentResult));
    }
  }

  function updateBestScore() {
    const bestScore = readBestScore();

    elements.bestScoreValue.textContent = bestScore
      ? `${bestScore.moves} / ${formatTime(bestScore.time)}`
      : "-";
  }

  function readBestScore() {
    try {
      const rawValue = localStorage.getItem(getBestScoreKey());
      return rawValue ? JSON.parse(rawValue) : null;
    } catch (error) {
      return null;
    }
  }

  function getBestScoreKey() {
    return `memory-match-best-${state.difficulty}`;
  }

  function closeModal() {
    elements.winModal.classList.add("hidden");
  }

  function findCardElement(cardId) {
    return elements.board.querySelector(`[data-card-id="${cardId}"]`);
  }

  function toggleTheme() {
    state.theme = state.theme === "light" ? "dark" : "light";
    applyTheme();

    try {
      localStorage.setItem("memory-match-theme", state.theme);
    } catch (error) {
      // Ignore storage issues and keep the in-memory preference.
    }
  }

  function loadTheme() {
    try {
      const savedTheme = localStorage.getItem("memory-match-theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        state.theme = savedTheme;
      }
    } catch (error) {
      state.theme = "light";
    }

    applyTheme();
  }

  function applyTheme() {
    const isDark = state.theme === "dark";
    document.body.classList.toggle("dark-theme", isDark);
    elements.themeToggle.setAttribute("aria-pressed", String(isDark));
    elements.themeToggleIcon.textContent = isDark ? "☀️" : "🌙";
    elements.themeToggleLabel.textContent = isDark ? "Light Mode" : "Dark Mode";
  }

  function playTone(frequency, duration, type = "sine", volume = 0.04) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    if (!playTone.audioContext) {
      playTone.audioContext = new AudioContextClass();
    }

    const context = playTone.audioContext;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const startTime = context.currentTime;

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  initialize();
})();
