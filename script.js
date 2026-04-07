(() => {
  const SYMBOL_POOL = [
    "\uD83D\uDC36", "\uD83C\uDF55", "\uD83D\uDE97", "\uD83C\uDFAE", "\u2B50", "\uD83C\uDF4E", "\uD83C\uDF08", "\uD83E\uDD8B",
    "\uD83C\uDFB5", "\uD83D\uDE80", "\uD83C\uDF3B", "\uD83C\uDF69", "\u26BD", "\uD83E\uDDE9", "\uD83E\uDD84", "\uD83C\uDF49",
    "\uD83D\uDC31", "\uD83C\uDFAF", "\uD83C\uDF54", "\uD83D\uDEB2", "\uD83C\uDF19", "\uD83C\uDFB2", "\uD83C\uDF53", "\uD83D\uDEF8",
    "\uD83D\uDC3C", "\uD83C\uDF88", "\uD83E\uDD55", "\uD83C\uDFC0", "\uD83C\uDF6A", "\uD83E\uDE90", "\uD83C\uDF35", "\uD83C\uDFB9"
  ];

  const DIFFICULTY_SETTINGS = {
    easy: { label: "Easy", size: 4, pairs: 8 },
    medium: { label: "Medium", size: 6, pairs: 18 },
    hard: { label: "Hard", size: 8, pairs: 32 }
  };

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

  const elements = {};

  function initialize() {
    try {
      cacheElements();
      validateRequiredElements();
      showBoardMessage("Loading cards...");
      loadTheme();
      attachEvents();
      startNewGame();
      console.info("[MemoryGame] Initialized successfully.");
    } catch (error) {
      reportError("Game initialization failed.", error, true);
    }
  }

  function cacheElements() {
    elements.board = document.getElementById("gameBoard");
    elements.boardMessage = document.getElementById("boardMessage");
    elements.movesValue = document.getElementById("movesValue");
    elements.timerValue = document.getElementById("timerValue");
    elements.bestScoreValue = document.getElementById("bestScoreValue");
    elements.difficultySelect = document.getElementById("difficultySelect");
    elements.restartButton = document.getElementById("restartButton");
    elements.statusMessage = document.getElementById("statusMessage");
    elements.winModal = document.getElementById("winModal");
    elements.winSummary = document.getElementById("winSummary");
    elements.playAgainButton = document.getElementById("playAgainButton");
    elements.themeToggle = document.getElementById("themeToggle");
    elements.themeToggleIcon = document.querySelector(".theme-toggle__icon");
    elements.themeToggleLabel = document.querySelector(".theme-toggle__label");
  }

  function validateRequiredElements() {
    const missingEntries = Object.entries(elements)
      .filter(([, element]) => !element)
      .map(([key]) => key);

    if (missingEntries.length > 0) {
      throw new Error(`Missing required DOM elements: ${missingEntries.join(", ")}`);
    }
  }

  function attachEvents() {
    elements.board.addEventListener("touchend", handleBoardTouch, { passive: false });
    elements.difficultySelect.addEventListener("change", handleDifficultyChange);
    elements.restartButton.addEventListener("click", startNewGame);
    elements.playAgainButton.addEventListener("click", handlePlayAgain);
    elements.themeToggle.addEventListener("click", toggleTheme);
    elements.winModal.addEventListener("click", handleModalClick);
  }

  function handleBoardTouch(event) {
    const cardButton = event.target.closest(".memory-card");

    if (!cardButton || !elements.board.contains(cardButton)) {
      return;
    }

    event.preventDefault();
    handleCardClick(cardButton.dataset.cardId);
  }

  function handleDifficultyChange(event) {
    state.difficulty = event.target.value;
    startNewGame();
  }

  function handlePlayAgain() {
    closeModal();
    startNewGame();
  }

  function handleModalClick(event) {
    if (event.target === elements.winModal) {
      closeModal();
    }
  }

  function startNewGame() {
    try {
      resetGameState();
      showBoardMessage("Loading cards...");
      buildDeck();
      renderBoard();
      updateStats();
      updateBestScore();
      setStatus(`Ready for a ${DIFFICULTY_SETTINGS[state.difficulty].label.toLowerCase()} game. Flip a card to begin.`);
      closeModal();
    } catch (error) {
      reportError("Unable to start a new game.", error, true);
    }
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

    if (!config) {
      throw new Error(`Unsupported difficulty: ${state.difficulty}`);
    }

    const selectedSymbols = SYMBOL_POOL.slice(0, config.pairs);

    if (selectedSymbols.length !== config.pairs) {
      throw new Error(`Not enough symbols available for ${config.label}.`);
    }

    const deck = [...selectedSymbols, ...selectedSymbols].map((symbol, index) => ({
      id: `${state.difficulty}-${index}-${Math.random().toString(16).slice(2, 8)}`,
      symbol,
      isFlipped: false,
      isMatched: false
    }));

    state.cards = shuffle(deck);
  }

  function shuffle(items) {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    return shuffled;
  }

  function renderBoard() {
    const config = DIFFICULTY_SETTINGS[state.difficulty];

    if (!Array.isArray(state.cards) || state.cards.length === 0) {
      showBoardMessage("No cards available. Restart the game to try again.");
      console.warn("[MemoryGame] renderBoard called with no cards.");
      return;
    }

    elements.board.innerHTML = "";
    elements.board.className = `game-board board-${state.difficulty}`;
    elements.board.setAttribute("aria-label", `${config.label} board with ${config.size * config.size} cards`);

    const fragment = document.createDocumentFragment();

    state.cards.forEach((card) => {
      const button = document.createElement("button");
      button.className = "memory-card";
      button.type = "button";
      button.dataset.cardId = card.id;
      button.setAttribute("aria-label", "Hidden memory card");
      button.addEventListener("click", () => handleCardClick(card.id));

      const inner = document.createElement("span");
      inner.className = "memory-card__inner";

      const backFace = document.createElement("span");
      backFace.className = "memory-card__face memory-card__face--back";
      backFace.setAttribute("aria-hidden", "true");
      backFace.textContent = "?";

      const frontFace = document.createElement("span");
      frontFace.className = "memory-card__face memory-card__face--front";
      frontFace.setAttribute("aria-hidden", "true");
      frontFace.textContent = card.symbol;

      inner.appendChild(backFace);
      inner.appendChild(frontFace);
      button.appendChild(inner);

      fragment.appendChild(button);
    });

    elements.board.appendChild(fragment);
    hideBoardMessage();
    console.info(`[MemoryGame] Rendered ${state.cards.length} cards for ${state.difficulty}.`);
  }

  function handleCardClick(cardId) {
    try {
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
    } catch (error) {
      reportError("Card click failed.", error, false);
    }
  }

  function flipCard(card) {
    card.isFlipped = true;
    const cardElement = findCardElement(card.id);

    if (!cardElement) {
      throw new Error(`Card element not found for ${card.id}`);
    }

    cardElement.classList.add("is-flipped");
    cardElement.setAttribute("aria-label", `Revealed card ${card.symbol}`);
    playTone(440, 0.05, "triangle", 0.03);
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

  function showBoardMessage(message) {
    elements.boardMessage.textContent = message;
    elements.boardMessage.classList.add("is-visible");
    elements.board.classList.add("is-hidden");
  }

  function hideBoardMessage() {
    elements.boardMessage.classList.remove("is-visible");
    elements.board.classList.remove("is-hidden");
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
      reportError("Best score could not be read from localStorage.", error, false);
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
      reportError("Theme preference could not be saved.", error, false);
    }
  }

  function loadTheme() {
    try {
      const savedTheme = localStorage.getItem("memory-match-theme");

      if (savedTheme === "dark" || savedTheme === "light") {
        state.theme = savedTheme;
      }
    } catch (error) {
      reportError("Theme preference could not be loaded.", error, false);
      state.theme = "light";
    }

    applyTheme();
  }

  function applyTheme() {
    const isDark = state.theme === "dark";
    document.body.classList.toggle("dark-theme", isDark);
    elements.themeToggle.setAttribute("aria-pressed", String(isDark));
    elements.themeToggleIcon.textContent = isDark ? "\u2600\uFE0F" : "\uD83C\uDF19";
    elements.themeToggleLabel.textContent = isDark ? "Light Mode" : "Dark Mode";
  }

  function reportError(message, error, showFallback = false) {
    console.error(`[MemoryGame] ${message}`, error);

    if (showFallback && elements.boardMessage && elements.board) {
      showBoardMessage("Unable to load the game board. Check the console and refresh the page.");
    }

    if (elements.statusMessage) {
      elements.statusMessage.textContent = "Something went wrong. Open the console for details.";
    }
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
      context.resume().catch((error) => {
        reportError("Audio context could not resume.", error, false);
      });
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
