// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCGR_2qYHKhxj3a7_QO5OUEhdQ8SGVHVQE",
    authDomain: "tic-tac-toe-multiplayer-ad35d.firebaseapp.com",
    databaseURL: "https://tic-tac-toe-multiplayer-ad35d-default-rtdb.firebaseio.com",
    projectId: "tic-tac-toe-multiplayer-ad35d",
    storageBucket: "tic-tac-toe-multiplayer-ad35d.appspot.com",
    messagingSenderId: "1071018544564",
    appId: "1:1071018544564:web:e77ef5c47f4c3ddd6e37e3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

document.addEventListener('DOMContentLoaded', () => {
    // Game state
    const state = {
        board: Array(9).fill(null),
        currentPlayer: 'O',
        gameEnded: false,
        myPlayer: null,
        gameId: null,
        playerName: '',
        opponentName: '',
        scores: {
            X: 0,
            O: 0
        },
        winningCombos: [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
            [0, 4, 8], [2, 4, 6]             // diagonals
        ]
    };

    // DOM elements
    const gameSetupEl = document.getElementById('game-setup');
    const gameContainerEl = document.getElementById('game-container');
    const boardEl = document.getElementById('board');
    const cells = boardEl.querySelectorAll('.cell');
    const playerXEl = document.getElementById('player-x');
    const playerOEl = document.getElementById('player-o');
    const playerXNameEl = document.getElementById('player-x-name');
    const playerONameEl = document.getElementById('player-o-name');
    const scoreXEl = document.getElementById('score-x');
    const scoreOEl = document.getElementById('score-o');
    const gameStatusEl = document.getElementById('game-status');
    const restartBtn = document.getElementById('restart-btn');
    const leaveBtn = document.getElementById('leave-btn');
    const playerNameInput = document.getElementById('player-name');
    const gameActionSelect = document.getElementById('game-action');
    const gameIdGroup = document.getElementById('game-id-group');
    const gameIdInput = document.getElementById('game-id');
    const startBtn = document.getElementById('start-btn');
    const gameIdDisplay = document.getElementById('game-id-display');
    const currentGameIdEl = document.getElementById('current-game-id');
    const copyBtn = document.getElementById('copy-btn');
    const whatsappShareBtn = document.getElementById('whatsapp-share');
    const smsShareBtn = document.getElementById('sms-share');
    const xWaitingEl = document.getElementById('x-waiting');
    const oWaitingEl = document.getElementById('o-waiting');
    const toastEl = document.getElementById('toast');

    // Event listeners
    gameActionSelect.addEventListener('change', toggleGameIdInput);
    startBtn.addEventListener('click', startGame);
    boardEl.addEventListener('click', handleCellClick);
    restartBtn.addEventListener('click', restartGame);
    leaveBtn.addEventListener('click', leaveGame);
    copyBtn.addEventListener('click', copyGameId);
    whatsappShareBtn.addEventListener('click', shareViaWhatsApp);
    smsShareBtn.addEventListener('click', shareViaSMS);

    // Functions
    function toggleGameIdInput() {
        if (gameActionSelect.value === 'join') {
            gameIdGroup.style.display = 'block';
        } else {
            gameIdGroup.style.display = 'none';
        }
    }

    function startGame() {
        const playerName = playerNameInput.value.trim();
        if (!playerName) {
            showToast('Please enter your name');
            return;
        }

        state.playerName = playerName;

        if (gameActionSelect.value === 'create') {
            createGame();
        } else {
            const gameId = gameIdInput.value.trim();
            if (!gameId) {
                showToast('Please enter a game ID');
                return;
            }
            joinGame(gameId);
        }
    }

    function createGame() {
        state.gameId = generateGameId();
        currentGameIdEl.textContent = state.gameId;
        gameIdDisplay.style.display = 'flex';
        
        // Player who creates the game is X by default
        state.myPlayer = 'X';
        playerXNameEl.textContent = state.playerName;
        
        // Show waiting indicator for O
        oWaitingEl.style.display = 'flex';
        
        // Initialize the game in Firebase
        const gameRef = database.ref('games/' + state.gameId);
        
        gameRef.set({
            board: state.board,
            currentPlayer: 'O',  // First move is O's turn
            playerX: state.playerName,
            playerO: null,
            gameEnded: false,
            scores: state.scores,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        }).catch(error => {
            console.error("Error creating game:", error);
            showToast('Error creating game. Please try again.');
        });
        
        // Listen for changes
        gameRef.on('value', (snapshot) => {
            const gameData = snapshot.val();
            if (!gameData) {
                // Game was deleted
                if (!state.gameEnded) {
                    showToast('Game was ended by other player');
                    setTimeout(() => {
                        leaveGame();
                    }, 2000);
                }
                return;
            }
            
            updateGameState(gameData);
        });
        
        // Switch to game view
        gameSetupEl.style.display = 'none';
        gameContainerEl.classList.add('active');
        
        gameStatusEl.textContent = 'Waiting for opponent to join...';
    }

    function joinGame(gameId) {
        state.gameId = gameId;
        currentGameIdEl.textContent = gameId;
        gameIdDisplay.style.display = 'flex';
        
        const gameRef = database.ref('games/' + gameId);
        
        // Show waiting indicator during connection
        gameStatusEl.textContent = 'Connecting to game...';
        
        // Check if game exists
        gameRef.once('value').then((snapshot) => {
            const gameData = snapshot.val();
            
            if (!gameData) {
                showToast('Game not found. Please check the ID and try again.');
                gameStatusEl.textContent = 'Game not found';
                return;
            }
            
            if (!gameData.playerX) {
                showToast('The game creator has left. Please create a new game.');
                gameStatusEl.textContent = 'Game creator left';
                return;
            }
            
            if (gameData.playerO) {
                showToast('This game already has 2 players.');
                gameStatusEl.textContent = 'Game is full';
                return;
            }
            
            // Player who joins becomes O
            state.myPlayer = 'O';
            playerONameEl.textContent = state.playerName;
            
            // Show waiting indicator for X
            xWaitingEl.style.display = 'flex';
            
            // Update game with second player
            gameRef.update({
                playerO: state.playerName,
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
            }).catch(error => {
                console.error("Error joining game:", error);
                showToast('Error joining game. Please try again.');
            });
            
            // Listen for changes
            gameRef.on('value', (snapshot) => {
                const gameData = snapshot.val();
                if (!gameData) {
                    // Game was deleted
                    if (!state.gameEnded) {
                        showToast('Game was ended by other player');
                        setTimeout(() => {
                            leaveGame();
                        }, 2000);
                    }
                    return;
                }
                
                updateGameState(gameData);
            });
            
            // Switch to game view
            gameSetupEl.style.display = 'none';
            gameContainerEl.classList.add('active');
            
            gameStatusEl.textContent = 'Game joined! Waiting for move...';
        }).catch(error => {
            console.error("Error fetching game:", error);
            showToast('Error connecting to game. Please try again.');
            gameStatusEl.textContent = 'Connection error';
        });
    }

    function generateGameId() {
        // Generate a 6-character alphanumeric ID
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous characters
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    function updateGameState(gameData) {
        // Update state from Firebase
        state.board = gameData.board || Array(9).fill(null);
        state.currentPlayer = gameData.currentPlayer || 'O';
        state.gameEnded = gameData.gameEnded || false;
        state.scores = gameData.scores || { X: 0, O: 0 };
        
        // Update player names
        if (gameData.playerX) {
            playerXNameEl.textContent = gameData.playerX;
            if (gameData.playerX !== 'Player X') {
                xWaitingEl.style.display = 'none';
            }
        }
        
        if (gameData.playerO) {
            playerONameEl.textContent = gameData.playerO;
            if (gameData.playerO !== 'Player O') {
                oWaitingEl.style.display = 'none';
            }
        }
        
        // Update UI
        updateBoardUI();
        updateUI();
        
        // Check if game has a winner
        if (state.gameEnded) {
            const winner = getWinner();
            if (winner) {
                gameStatusEl.textContent = `${winner === 'X' ? (gameData.playerX || 'Player X') : (gameData.playerO || 'Player O')} wins!`;
            } else {
                gameStatusEl.textContent = "It's a draw!";
            }
        } else {
            if (gameData.playerX && gameData.playerO) {
                gameStatusEl.textContent = `Current turn: ${state.currentPlayer === 'X' ? (gameData.playerX || 'Player X') : (gameData.playerO || 'Player O')}`;
            } else {
                // Waiting for player to join
                if (state.myPlayer === 'X') {
                    gameStatusEl.textContent = 'Waiting for player O to join...';
                } else {
                    gameStatusEl.textContent = 'Waiting for player X...';
                }
            }
        }
    }

    function updateBoardUI() {
        cells.forEach((cell, index) => {
            cell.className = 'cell';
            if (state.board[index]) {
                cell.classList.add(state.board[index].toLowerCase());
            }
        });
        
        // Highlight winning cells if game is over
        if (state.gameEnded) {
            const winner = getWinner();
            if (winner) {
                const winningCombo = state.winningCombos.find(combo => {
                    return combo.every(i => state.board[i] === winner);
                });
                
                if (winningCombo) {
                    winningCombo.forEach(index => {
                        cells[index].classList.add('winner');
                    });
                    
                    if (winner === state.myPlayer) {
                        createConfetti();
                    }
                }
            }
        }
    }

    function handleCellClick(e) {
        // Don't allow moves if:
        // - Game is over
        // - It's not your turn
        // - You haven't joined a game yet
        if (state.gameEnded || state.currentPlayer !== state.myPlayer || !state.myPlayer) return;
        
        const cell = e.target.closest('.cell');
        if (!cell) return;

        const index = cell.dataset.index;

        // If cell is already occupied, ignore the click
        if (state.board[index]) return;

        // Make the move - update local state first for immediate feedback
        state.board[index] = state.myPlayer;
        updateBoardUI();
        
        // Then update Firebase
        const gameRef = database.ref('games/' + state.gameId);
        
        // Switch player
        const newCurrentPlayer = state.myPlayer === 'X' ? 'O' : 'X';
        
        // Check for win or draw
        const winner = checkWin(state.myPlayer) ? state.myPlayer : null;
        const isDraw = !winner && checkDraw();
        
        const updates = {
            board: state.board,
            currentPlayer: newCurrentPlayer,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        };
        
        if (winner) {
            updates.gameEnded = true;
            updates['scores/' + winner] = (state.scores[winner] || 0) + 1;
        } else if (isDraw) {
            updates.gameEnded = true;
        }
        
        gameRef.update(updates).catch(error => {
            console.error("Error updating game:", error);
            showToast('Error making move. Please try again.');
            // Revert the move
            state.board[index] = null;
            updateBoardUI();
        });
    }

    function checkWin(player) {
        return state.winningCombos.some(combo => {
            return combo.every(index => {
                return state.board[index] === player;
            });
        });
    }

    function getWinner() {
        if (checkWin('X')) return 'X';
        if (checkWin('O')) return 'O';
        return null;
    }

    function checkDraw() {
        return !state.board.includes(null) && !getWinner();
    }

    function updateUI() {
        // Update active player indicator
        if (!state.gameEnded && state.myPlayer) {
            if (state.currentPlayer === state.myPlayer) {
                if (state.myPlayer === 'X') {
                    playerXEl.classList.add('active');
                    playerOEl.classList.remove('active');
                } else {
                    playerXEl.classList.remove('active');
                    playerOEl.classList.add('active');
                }
            } else {
                playerXEl.classList.remove('active');
                playerOEl.classList.remove('active');
            }
        }
        
        // Update scores
        scoreXEl.textContent = state.scores.X || 0;
        scoreOEl.textContent = state.scores.O || 0;
    }

    function restartGame() {
        if (!state.gameId) return;
        
        const gameRef = database.ref('games/' + state.gameId);

        
        gameRef.update({
            board: Array(9).fill(null),
            currentPlayer: state.myPlayer === 'X' ? 'O' : 'X', // Alternate starting player
            gameEnded: false,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        }).catch(error => {
            console.error("Error restarting game:", error);
            showToast('Error restarting game. Please try again.');
        });
    }

    function leaveGame() {
        if (state.gameId) {
            const gameRef = database.ref('games/' + state.gameId);
            
            // Remove the game if both players leave
            gameRef.once('value').then((snapshot) => {
                const gameData = snapshot.val();
                if (!gameData) return;
                
                if (state.myPlayer === 'X') {
                    if (!gameData.playerO) {
                        // If O hasn't joined, delete the game
                        gameRef.remove().catch(error => {
                            console.error("Error removing game:", error);
                        });
                    } else {
                        // If O has joined, just remove X
                        gameRef.update({
                            playerX: null,
                            lastUpdated: firebase.database.ServerValue.TIMESTAMP
                        }).catch(error => {
                            console.error("Error updating game:", error);
                        });
                    }
                } else {
                    // Player O is leaving
                    gameRef.update({
                        playerO: null,
                        lastUpdated: firebase.database.ServerValue.TIMESTAMP
                    }).catch(error => {
                        console.error("Error updating game:", error);
                    });
                }
            }).catch(error => {
                console.error("Error fetching game:", error);
            });
        }
        
        // Stop listening to changes
        if (state.gameId) {
            database.ref('games/' + state.gameId).off();
        }
        
        // Reset state
        resetState();
        
        // Switch back to setup view
        gameContainerEl.classList.remove('active');
        gameSetupEl.style.display = 'block';
    }

    function resetState() {
        state.board = Array(9).fill(null);
        state.currentPlayer = 'O';
        state.gameEnded = false;
        state.myPlayer = null;
        state.gameId = null;
        state.opponentName = '';
        state.scores = { X: 0, O: 0 };
        
        playerXNameEl.textContent = 'Player X';
        playerONameEl.textContent = 'Player O';
        
        xWaitingEl.style.display = 'none';
        oWaitingEl.style.display = 'none';
        
        updateBoardUI();
    }

    function copyGameId() {
        if (!state.gameId) return;
        
        navigator.clipboard.writeText(state.gameId).then(() => {
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            
            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            }, 2000);
        }).catch(() => {
            // Fallback for browsers that don't support clipboard API
            const textarea = document.createElement('textarea');
            textarea.value = state.gameId;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            
            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            }, 2000);
        });
    }

    function shareViaWhatsApp() {
        if (!state.gameId) return;
        
        const text = `Join me in Tic Tac Toe! Game ID: ${state.gameId}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    }

    function shareViaSMS() {
        if (!state.gameId) return;
        
        const text = `Join me in Tic Tac Toe! Game ID: ${state.gameId}`;
        const url = `sms:?body=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    }

    function createConfetti() {
        const colors = ['#f72585', '#4361ee', '#3a0ca3', '#4cc9f0', '#2ecc71'];
        const container = document.querySelector('.game-container');
        const containerRect = container.getBoundingClientRect();
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            
            // Random properties
            const size = Math.random() * 8 + 4;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const left = Math.random() * containerRect.width;
            const animationDuration = Math.random() * 3 + 2;
            
            confetti.style.width = `${size}px`;
            confetti.style.height = `${size}px`;
            confetti.style.backgroundColor = color;
            confetti.style.left = `${left}px`;
            confetti.style.top = `-20px`;
            confetti.style.position = 'absolute';
            confetti.style.zIndex = '100';
            confetti.style.animation = `confettiFall ${animationDuration}s linear forwards`;
            
            // Add random rotation
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            
            container.appendChild(confetti);
            
            // Remove after animation
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.remove();
                }
            }, animationDuration * 1000);
        }
        
        // Add the animation keyframes dynamically
        const style = document.createElement('style');
        style.textContent = `
            @keyframes confettiFall {
                0% {
                    transform: translateY(0) rotate(0deg) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translateY(${containerRect.height}px) rotate(360deg) scale(0);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function showToast(message, duration = 3000) {
        toastEl.textContent = message;
        toastEl.classList.add('show');
        
        setTimeout(() => {
            toastEl.classList.remove('show');
        }, duration);
    }
});
function joinGame(gameId) {
    const gameRef = database.ref('games/' + gameId);

    gameRef.once('value').then((snapshot) => {
        const gameData = snapshot.val();
        if (!gameData) {
            showToast("Game ID not found. Please check and try again.");
            return;
        }

        // Check if the game already has two players
        if (gameData.playerX && gameData.playerO) {
            showToast("This game is already full.");
            return;
        }

        // Determine player's role (X or O)
        let playerRole = gameData.playerX ? 'O' : 'X';

        // Update database to add this player
        gameRef.update({
            [`player${playerRole}`]: state.myPlayerName, // Save the player's name
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            state.gameId = gameId;
            state.myPlayer = playerRole;
            showToast(`Joined game as Player ${playerRole}`);
            startGame(); // Function to initialize the game UI
        }).catch(error => {
            console.error("Error joining game:", error);
            showToast("Error joining game. Please try again.");
        });
    }).catch(error => {
        console.error("Error fetching game:", error);
        showToast("Error connecting to the server.");
    });
}
document.getElementById("joinGameButton").addEventListener("click", () => {
    const gameId = document.getElementById("gameIdInput").value.trim();
    if (gameId) {
        joinGame(gameId);
    } else {
        showToast("Please enter a valid Game ID.");
    }
});
database.ref('games/' + state.gameId).on('value', (snapshot) => {
    const gameData = snapshot.val();
    if (gameData) {
        updateUI(gameData);
    }
});
