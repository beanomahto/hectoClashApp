const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./src/config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const http = require("http");
const { Server } = require("socket.io");
const User = require("./models/User");
const { v4: uuidv4 } = require('uuid');
const math = require('mathjs');
const Game = require("./models/Game");
const friendRoutes = require('./routes/friendRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const HectocGenerator = require('./utility/HectocGenerator');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// === State Management ===
let onlineUsers = {}; // { userId: { socketId: socket.id, name: user.name } }
let activeGames = {}; // { gameId: gameData } - See structure below
let matchmakingQueue = []; // <<< NEW: Array to hold users waiting for a match { userId, name, socketId }

const TOTAL_ROUNDS = 5;
const ROUND_TIME_LIMIT_SECONDS = 60; // Time limit for each puzzle
const OVERALL_GAME_TIME_LIMIT_SECONDS = TOTAL_ROUNDS * ROUND_TIME_LIMIT_SECONDS + 30; // Max total time
const POINTS_PER_WIN = 10;
const POINTS_PER_LOSS = -5; // Optional: Penalize losses
const POINTS_PER_DRAW = 0;

/* Example structure for activeGames[gameId]:
{
    gameId: string,
    player1Id: string,
    player2Id: string,
    player1: { userId, name, socketId },
    player2: { userId, name, socketId },
    startTime: Date, // Challenge start time
    overallTimeLimitSeconds: number,
    roundTimeLimitSeconds: number,
    status: 'in_progress',
    currentRound: number, // Index 0 to TOTAL_ROUNDS - 1
    player1Score: number,
    player2Score: number,
    rounds: [ // Stores data *during* the active game
        {
            roundNumber: number, // 1 to 5
            puzzle: string,
            startTime: Date,
            player1: { solution: string | null, timeTakenMs: number | null, correct: boolean | null },
            player2: { solution: string | null, timeTakenMs: number | null, correct: boolean | null },
            // roundWinnerId: string | null // Determined when round ends
            // endedReason: string | null // Determined when round ends
        }
    ],
    overallTimerId: NodeJS.Timeout | null, // For the entire challenge
    roundTimerId: NodeJS.Timeout | null // For the current round
}
*/

// Share onlineUsers with Express routes
app.set('onlineUsers', onlineUsers);
io.sockets.server.settings = { onlineUsers: onlineUsers };

app.use(cors());
app.use(bodyParser.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes(io));
app.use("/api/leaderboard", leaderboardRoutes); // Make sure this route is defined

// --- Helper Functions ---

async function getOnlineUserDetails() {
    const onlineUserIds = Object.keys(onlineUsers);
    if (onlineUserIds.length === 0) return [];
    try {
        const users = await User.find({ _id: { $in: onlineUserIds } }).select("_id name playerId");
        return users;
    } catch (err) {
        console.error("Error fetching online user details:", err);
        return [];
    }
}

async function emitOnlineUsersUpdate() {
    const userDetails = await getOnlineUserDetails();
    io.emit("update-online-users", userDetails);
}

function generateHectocPuzzleSafe() {
    try {
        const challenge = HectocGenerator.generate();
        return challenge.toString();
    } catch (error) {
        console.error("[CRITICAL] Failed to generate Hectoc puzzle:", error);
        return null; // Indicate failure
    }
}

function validateHectocSolution(puzzle, solution) {
    // (Keep your existing validation logic - it's good)
    if (!solution || typeof solution !== 'string' || solution.trim() === '') {
        return { isValid: false, reason: 'empty_solution' };
    }
    try {
        const solutionDigits = solution.replace(/[^1-9]/g, '');
        const sortedPuzzle = puzzle.split('').sort().join('');
        const sortedSolutionDigits = solutionDigits.split('').sort().join('');
        if (sortedSolutionDigits !== sortedPuzzle || solutionDigits.length !== 6) {
            console.log(`Validation Fail: Digits. Puzzle: ${puzzle}, Solution Digits: ${solutionDigits}`);
            return { isValid: false, reason: 'digit_mismatch' };
        }
        const result = math.evaluate(solution);
        const tolerance = 0.00001;
        if (Math.abs(result - 100) < tolerance) {
            console.log(`Validation OK: ${solution} = ${result}`);
            return { isValid: true, result: result };
        } else {
            console.log(`Validation Fail: Result ${result} !== 100`);
            return { isValid: false, reason: 'wrong_result', result: result };
        }
    } catch (error) {
        console.log(`Validation Fail: Error - ${error.message}`);
        return { isValid: false, reason: 'evaluation_error', error: error.message };
    }
}

// --- <<< NEW: Centralized Game Starting Function >>> ---
// This can be called by both direct challenges (respond_challenge) and matchmaking
async function startGame(player1Data, player2Data) {
    const gameId = uuidv4();
    const firstPuzzle = generateHectocPuzzleSafe();
    const startTime = new Date(); // Challenge start time

    console.log(`[startGame] Attempting to start game ${gameId} between ${player1Data.name} and ${player2Data.name}`);

    if (!firstPuzzle) {
        console.error("[startGame] CRITICAL: Failed to generate first Hectoc puzzle.");
        // Notify players about the error
        io.to(player1Data.socketId).to(player2Data.socketId).emit('game_start_failed', { reason: 'server_puzzle_error' });
        return null; // Indicate failure
    }

    const firstRoundStartTime = new Date();
    // Store initial game details in memory
    const newGame = {
        gameId: gameId,
        player1Id: player1Data.userId,
        player2Id: player2Data.userId,
        player1: { userId: player1Data.userId, name: player1Data.name, socketId: player1Data.socketId },
        player2: { userId: player2Data.userId, name: player2Data.name, socketId: player2Data.socketId },
        startTime: startTime,
        overallTimeLimitSeconds: OVERALL_GAME_TIME_LIMIT_SECONDS,
        roundTimeLimitSeconds: ROUND_TIME_LIMIT_SECONDS,
        status: 'in_progress',
        currentRound: 0, // Start at round index 0
        player1Score: 0,
        player2Score: 0,
        rounds: [ // Initialize with first round data
            {
                roundNumber: 1,
                puzzle: firstPuzzle,
                startTime: firstRoundStartTime,
                player1: { solution: null, timeTakenMs: null, correct: null },
                player2: { solution: null, timeTakenMs: null, correct: null }
            }
        ],
        overallTimerId: null,
        roundTimerId: null
    };
    activeGames[gameId] = newGame;

    // Create game record in DB
    try {
        await Game.create({
            gameId: gameId,
            player1: { userId: player1Data.userId, name: player1Data.name },
            player2: { userId: player2Data.userId, name: player2Data.name },
            startTime: startTime,
            overallTimeLimitSeconds: OVERALL_GAME_TIME_LIMIT_SECONDS,
            roundTimeLimitSeconds: ROUND_TIME_LIMIT_SECONDS,
            status: 'in_progress',
            currentRound: 0,
            rounds: [{ roundNumber: 1, puzzle: firstPuzzle, startTime: firstRoundStartTime }]
        });
        console.log(`[DB] Game ${gameId} created in DB.`);
    } catch(dbError) {
        console.error(`[DB Error] Failed to create game ${gameId} in DB:`, dbError);
        io.to(player1Data.socketId).to(player2Data.socketId).emit('game_start_failed', { reason: 'server_db_error'});
        delete activeGames[gameId]; // Clean up in-memory state
        return null; // Indicate failure
    }

    // Make both players join the Socket.IO room
    const socket1 = io.sockets.sockets.get(player1Data.socketId);
    const socket2 = io.sockets.sockets.get(player2Data.socketId);
    if (socket1) socket1.join(gameId);
    if (socket2) socket2.join(gameId);
    console.log(`Sockets for ${player1Data.name} and ${player2Data.name} joined room ${gameId}`);

    // Set timers
    const game = activeGames[gameId]; // Get reference to the newly added game
    game.overallTimerId = setTimeout(async () => {
        console.log(`[Timer] Overall challenge ${gameId} timed out.`);
        if (activeGames[gameId]) { // Check if game still active
            await endChallenge(gameId, 'timeout', 'overall_time_limit_reached');
        }
    }, game.overallTimeLimitSeconds * 1000);

    game.roundTimerId = setTimeout(async () => {
        console.log(`[Timer] Round 1 timed out for game ${gameId}`);
        if (activeGames[gameId] && activeGames[gameId].currentRound === 0) { // Check if still on round 1
             await handleRoundEnd(gameId, null, 'timeout'); // No winner for round 1 timeout
        }
    }, game.roundTimeLimitSeconds * 1000);

    // Emit 'challenge_start' event to both players
    const challengeStartData = {
        gameId: gameId,
        totalRounds: TOTAL_ROUNDS,
        roundTimeLimitSeconds: game.roundTimeLimitSeconds,
        overallTimeLimitSeconds: game.overallTimeLimitSeconds,
        player1: { id: player1Data.userId, name: player1Data.name },
        player2: { id: player2Data.userId, name: player2Data.name },
        currentRound: 1,
        puzzle: firstPuzzle,
        player1Score: 0,
        player2Score: 0
    };
    io.to(gameId).emit('challenge_start', challengeStartData);
    console.log(`Emitted challenge_start for game ${gameId}`);

    return gameId; // Return the gameId if successful
}
// --- <<< END NEW >>> ---


// --- Core Game Flow Functions ---
// (startNextRound, handleRoundEnd, endChallenge remain the same as in your provided code)
async function startNextRound(gameId) {
    const game = activeGames[gameId];
    if (!game || game.status !== 'in_progress' || game.currentRound >= TOTAL_ROUNDS - 1) {
        console.log(`[startNextRound] Cannot start next round for ${gameId}. Status: ${game?.status}, Round: ${game?.currentRound}`);
        if (game && game.status === 'in_progress') {
            await endChallenge(gameId, 'completed'); // End normally if all rounds done
        }
        return;
    }

    game.currentRound++;
    const nextPuzzle = generateHectocPuzzleSafe();
    if (!nextPuzzle) {
        await endChallenge(gameId, 'error', 'puzzle_generation_failed');
        return;
    }

    const roundStartTime = new Date();
    const newRoundData = {
        roundNumber: game.currentRound + 1,
        puzzle: nextPuzzle,
        startTime: roundStartTime,
        player1: { solution: null, timeTakenMs: null, correct: null },
        player2: { solution: null, timeTakenMs: null, correct: null },
    };
    game.rounds.push(newRoundData);

    // Clear previous round timer, start new one
    if (game.roundTimerId) clearTimeout(game.roundTimerId);
    game.roundTimerId = setTimeout(async () => {
        console.log(`[Timer] Round ${game.currentRound + 1} timed out for game ${gameId}`);
        await handleRoundEnd(gameId, null, 'timeout'); // No winner on timeout
    }, game.roundTimeLimitSeconds * 1000);

    console.log(`[Game ${gameId}] Starting Round ${game.currentRound + 1} with puzzle ${nextPuzzle}`);

    // Notify players
    io.to(gameId).emit('new_round', {
        gameId,
        roundNumber: game.currentRound + 1,
        puzzle: nextPuzzle,
        player1Score: game.player1Score,
        player2Score: game.player2Score,
        roundTimeLimitSeconds: game.roundTimeLimitSeconds,
    });

    // Persist current round number to DB (optional, could do at end)
    try {
        await Game.updateOne({ gameId }, { $set: { currentRound: game.currentRound } });
    } catch (dbError) {
        console.error(`[DB Error] Failed to update currentRound for game ${gameId}:`, dbError);
    }
}


async function handleRoundEnd(gameId, roundWinnerId, reason) {
    const game = activeGames[gameId];
    if (!game || !game.rounds[game.currentRound] || game.rounds[game.currentRound].endedReason) {
         console.log(`[handleRoundEnd] Round already ended or game not found for ${gameId}, current round index: ${game?.currentRound}`);
         return; // Prevent double processing
    }

    console.log(`[Game ${gameId}] Round ${game.currentRound + 1} ended. Winner: ${roundWinnerId || 'None'}, Reason: ${reason}`);

    // Clear the round timer
    if (game.roundTimerId) {
        clearTimeout(game.roundTimerId);
        game.roundTimerId = null;
    }

    const currentRoundData = game.rounds[game.currentRound];
    currentRoundData.endTime = new Date();
    currentRoundData.endedReason = reason;
    currentRoundData.roundWinnerId = roundWinnerId;

    // Update score if someone won
    if (roundWinnerId === game.player1Id) {
        game.player1Score++;
    } else if (roundWinnerId === game.player2Id) {
        game.player2Score++;
    }

     // Gather round results to send to clients
    const roundResultPayload = {
        gameId,
        roundNumber: currentRoundData.roundNumber,
        roundWinnerId,
        reason, // 'solved' or 'timeout'
        player1Score: game.player1Score,
        player2Score: game.player2Score,
        player1RoundInfo: currentRoundData.player1,
        player2RoundInfo: currentRoundData.player2,
    };
    
    roundResultPayload.puzzle = currentRoundData.puzzle; // Send puzzle for context

    io.to(gameId).emit('round_over', roundResultPayload);


    // Check if the challenge should end
    if (game.currentRound >= TOTAL_ROUNDS - 1) {
        await endChallenge(gameId, 'completed');
    } else {
        // Start the next round after a short delay
        setTimeout(() => startNextRound(gameId), 3000); // 3-second delay
    }
}


async function endChallenge(gameId, finalStatus, reason = "normal") {
    console.log(`[endChallenge] Ending challenge ${gameId}. Status: ${finalStatus}, Reason: ${reason}`);
    const game = activeGames[gameId];
    if (!game) {
        console.error(`[endChallenge] Attempted to end non-existent or already ended challenge: ${gameId}`);
        return;
    }

    // Clear timers
    if (game.overallTimerId) clearTimeout(game.overallTimerId);
    if (game.roundTimerId) clearTimeout(game.roundTimerId);
    game.overallTimerId = null;
    game.roundTimerId = null;

    const endTime = new Date();
    // Determine overall winner/loser
    let challengeWinnerId = null;
    let challengeLoserId = null;
    let isDraw = false;

    if (finalStatus === 'abandoned') {
        // Reason holds the abandoner's ID
        challengeWinnerId = reason === game.player1Id ? game.player2Id : game.player1Id;
        challengeLoserId = reason;
        finalStatus = 'abandoned';
        reason = 'player_disconnected';
    } else if (finalStatus !== 'error') { // Calculate for completed/timeout
        if (game.player1Score > game.player2Score) {
            challengeWinnerId = game.player1Id;
            challengeLoserId = game.player2Id;
        } else if (game.player2Score > game.player1Score) {
            challengeWinnerId = game.player2Id;
            challengeLoserId = game.player1Id;
        } else {
            isDraw = true;
        }
    } // If error, winner/loser remain null


    try {
        // --- Persist Final Game Result ---
        await Game.findOneAndUpdate(
            { gameId: gameId },
            {
                $set: {
                    status: finalStatus,
                    endTime: endTime,
                    rounds: game.rounds,
                    player1Score: game.player1Score,
                    player2Score: game.player2Score,
                    challengeWinnerId: challengeWinnerId,
                    challengeLoserId: challengeLoserId,
                    currentRound: game.currentRound
                }
            },
            { new: true }
        );
        console.log(`[DB] Challenge ${gameId} final state saved. Status: ${finalStatus}, Winner: ${challengeWinnerId || (isDraw ? 'Draw' : 'None')}`);

        // --- Update Player Stats & Points ---
        const updatePromises = [];
        if (challengeWinnerId && challengeLoserId) { // Win/Loss
            updatePromises.push(User.findByIdAndUpdate(challengeWinnerId, { $inc: { wins: 1, totalGamesPlayed: 1, points: POINTS_PER_WIN } }).catch(err => console.error(`[DB] Error updating winner ${challengeWinnerId} stats:`, err)));
            updatePromises.push(User.findByIdAndUpdate(challengeLoserId, { $inc: { losses: 1, totalGamesPlayed: 1, points: POINTS_PER_LOSS } }).catch(err => console.error(`[DB] Error updating loser ${challengeLoserId} stats:`, err)));
        } else if (isDraw) { // Draw
             if (game.player1Id) updatePromises.push(User.findByIdAndUpdate(game.player1Id, { $inc: { draws: 1, totalGamesPlayed: 1, points: POINTS_PER_DRAW } }).catch(err => console.error(`[DB] Error updating player ${game.player1Id} stats (draw):`, err)));
             if (game.player2Id) updatePromises.push(User.findByIdAndUpdate(game.player2Id, { $inc: { draws: 1, totalGamesPlayed: 1, points: POINTS_PER_DRAW } }).catch(err => console.error(`[DB] Error updating player ${game.player2Id} stats (draw):`, err)));
        }
        await Promise.all(updatePromises);
        console.log(`[DB] Stats update attempted for players in challenge ${gameId}.`);

    } catch (dbError) {
        console.error(`[DB Error] Database error during endChallenge operations for ${gameId}:`, dbError);
    }

    // --- Notify Clients ---
    const payload = {
        gameId,
        finalStatus,
        reason,
        challengeWinnerId,
        challengeLoserId,
        isDraw,
        player1Score: game.player1Score,
        player2Score: game.player2Score,
        roundsData: game.rounds // Send detailed round breakdown
    };
    console.log(`[GameHandler] Emitting challenge_over to room ${gameId}`);
    io.to(gameId).emit('challenge_over', payload);

    // --- Clean Up Server State ---
    const player1SocketId = onlineUsers[game.player1Id]?.socketId;
    const player2SocketId = onlineUsers[game.player2Id]?.socketId;
    const socket1 = io.sockets.sockets.get(player1SocketId);
    const socket2 = io.sockets.sockets.get(player2SocketId);
    if (socket1) socket1.leave(gameId);
    if (socket2) socket2.leave(gameId);
    console.log(`Sockets removed from room ${gameId}`);

    delete activeGames[gameId]; // Remove from active games map
}


// --- <<< NEW Matchmaking Logic >>> ---
async function tryMatchmaking() {
    console.log(`[Matchmaking] Attempting match. Queue size: ${matchmakingQueue.length}`);
    while (matchmakingQueue.length >= 2) { // Use while loop to keep matching if possible
        // Get the first two players
        const player1Info = matchmakingQueue.shift();
        const player2Info = matchmakingQueue.shift();

        console.log(`[Matchmaking] Potential match: ${player1Info.name} vs ${player2Info.name}`);

        // --- Double Check if both players are still online and not already in a game ---
        const p1Online = onlineUsers[player1Info.userId] && onlineUsers[player1Info.userId].socketId === player1Info.socketId;
        const p2Online = onlineUsers[player2Info.userId] && onlineUsers[player2Info.userId].socketId === player2Info.socketId;

        const p1InGame = Object.values(activeGames).some(g => g.player1Id === player1Info.userId || g.player2Id === player1Info.userId);
        const p2InGame = Object.values(activeGames).some(g => g.player1Id === player2Info.userId || g.player2Id === player2Info.userId);

        let requeueP1 = false;
        let requeueP2 = false;
        let notifyP1Reason = null;
        let notifyP2Reason = null;

        if (!p1Online || p1InGame) {
            console.log(`[Matchmaking] Player 1 (${player1Info.name}) is offline or already in game.`);
            if (p2Online && !p2InGame) requeueP2 = true; // Re-queue Player 2 if they are valid
            else console.log(`[Matchmaking] Player 2 (${player2Info.name}) also invalid, dropping both.`);
            notifyP2Reason = 'opponent_unavailable';
        }
        if (!p2Online || p2InGame) {
            console.log(`[Matchmaking] Player 2 (${player2Info.name}) is offline or already in game.`);
            if (p1Online && !p1InGame) requeueP1 = true; // Re-queue Player 1 if they are valid
            else console.log(`[Matchmaking] Player 1 (${player1Info.name}) also invalid, dropping both.`);
            notifyP1Reason = 'opponent_unavailable';
        }

        // Handle re-queuing and notifications
        if (requeueP1) matchmakingQueue.unshift(player1Info);
        if (requeueP2) matchmakingQueue.unshift(player2Info);

        if (notifyP1Reason && player1Info.socketId) {
             io.to(player1Info.socketId).emit('matchmaking_failed', { reason: notifyP1Reason });
        }
        if (notifyP2Reason && player2Info.socketId) {
            io.to(player2Info.socketId).emit('matchmaking_failed', { reason: notifyP2Reason });
        }

        // If either player was invalid, continue the loop to check the queue again
        if (!p1Online || p1InGame || !p2Online || p2InGame) {
            continue; // Try matching again with remaining players in queue
        }

         // --- Both players valid, start the game ---
        console.log(`[Matchmaking] Match Found! Starting game between ${player1Info.name} and ${player2Info.name}`);
        const gameStarted = await startGame(player1Info, player2Info); // Use the centralized function
        if (!gameStarted) {
            // If game fails to start, maybe log, but don't requeue automatically to prevent loops
             console.error(`[Matchmaking] Failed to start game instance for ${player1Info.name} and ${player2Info.name}.`);
        }
        // If game started, players are removed from queue by shift(), loop continues if >= 2 left

    } // End while loop

    if (matchmakingQueue.length < 2) {
         console.log(`[Matchmaking] Not enough players to match. Current queue: ${matchmakingQueue.map(p => p.name).join(', ')}`);
    }
}
// --- <<< END NEW >>> ---


// === Socket.IO Connection Logic ===
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    let currentUserId = null;

    // --- User Online/Offline Handling ---
    socket.on("user-online", async (userId) => {
        if (!userId) return;
        try {
            const user = await User.findById(userId).select("name");
            if (!user) {
                console.warn(`User ${userId} not found in DB during user-online event.`);
                return;
            }
            console.log(`User online: ${user.name} (${userId}) on socket ${socket.id}`);
            currentUserId = userId;
            if (onlineUsers[userId] && onlineUsers[userId].socketId !== socket.id) {
                console.log(`User ${userId} reconnected with new socket ${socket.id}. Old: ${onlineUsers[userId].socketId}`);
            }
            onlineUsers[userId] = { socketId: socket.id, name: user.name };
            app.set('onlineUsers', onlineUsers);
            io.sockets.server.settings.onlineUsers = onlineUsers;
            await emitOnlineUsersUpdate();
        } catch (err) {
            console.error(`Error fetching user ${userId} on connect:`, err);
        }
    });

    socket.on("disconnect", async (reason) => {
        console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
        let userIdToCleanup = null;
        for (const userId in onlineUsers) {
            if (onlineUsers[userId].socketId === socket.id) {
                userIdToCleanup = userId;
                break;
            }
        }

        if (userIdToCleanup) {
            console.log(`Disconnecting user: ${onlineUsers[userIdToCleanup]?.name} (${userIdToCleanup})`);

            // --- Handle disconnect during active game ---
            const gameToEnd = Object.values(activeGames).find(g => g.player1Id === userIdToCleanup || g.player2Id === userIdToCleanup);
            if (gameToEnd && gameToEnd.status === 'in_progress') {
                console.log(`User ${userIdToCleanup} disconnected during challenge ${gameToEnd.gameId}. Ending challenge.`);
                await endChallenge(gameToEnd.gameId, 'abandoned', userIdToCleanup);
            }

            // --- <<< NEW: Handle disconnect while in matchmaking queue >>> ---
            const queueIndex = matchmakingQueue.findIndex(user => user.userId === userIdToCleanup);
            if (queueIndex > -1) {
                matchmakingQueue.splice(queueIndex, 1); // Remove user from queue
                console.log(`[Matchmaking] User ${userIdToCleanup} disconnected, removed from queue.`);
            }
            // --- <<< END NEW >>> ---

            delete onlineUsers[userIdToCleanup];
            app.set('onlineUsers', onlineUsers);
            io.sockets.server.settings.onlineUsers = onlineUsers;
            await emitOnlineUsersUpdate();
        } else {
            console.log(`Socket ${socket.id} disconnected without a tracked online user.`);
        }
        currentUserId = null; // Reset for this closed socket
    });

    socket.on("heartbeat", (userId) => {
        if (userId && onlineUsers[userId]) {
            if (onlineUsers[userId].socketId !== socket.id) {
                onlineUsers[userId].socketId = socket.id;
            }
        }
    });

    // --- Existing Game Logic Events (Direct Challenge) ---
    socket.on('challenge_user', (data) => {
        const { opponentUserId } = data;
        const challengerId = currentUserId;
        if (!challengerId) return console.error("Challenge attempt from unknown user.");
        if (!opponentUserId || challengerId === opponentUserId) return console.error("Invalid challenge target.");

        const opponent = onlineUsers[opponentUserId];
        const challenger = onlineUsers[challengerId];

        if (opponent && opponent.socketId && challenger) {
            console.log(`${challenger.name} (${challengerId}) is challenging ${opponent.name} (${opponentUserId})`);
            io.to(opponent.socketId).emit('receive_challenge', {
                challengerId: challengerId,
                challengerName: challenger.name
            });
        } else {
            console.log(`Cannot challenge: Opponent ${opponentUserId} offline or challenger info missing.`);
            socket.emit('challenge_failed', { reason: opponent ? 'opponent_offline' : 'challenger_info_missing' });
        }
    });

    socket.on('respond_challenge', async (data) => {
        const { challengerId, accepted } = data;
        const opponentId = currentUserId; // The user responding
        if (!opponentId) return console.error("Response from unknown user.");

        const challengerInfo = onlineUsers[challengerId];
        const opponentInfo = onlineUsers[opponentId];

        if (!challengerInfo || !challengerInfo.socketId || !opponentInfo) {
            console.error(`Cannot process response: Challenger ${challengerId} or Opponent ${opponentId} info missing.`);
             if (challengerInfo?.socketId) io.to(challengerInfo.socketId).emit('challenge_failed', { reason: 'opponent_info_missing' });
            return;
        }
        const challengerSocket = io.sockets.sockets.get(challengerInfo.socketId);
        if (!challengerSocket) {
             console.error(`Cannot process response: Challenger socket ${challengerInfo.socketId} not found.`);
             socket.emit('challenge_failed', { reason: 'challenger_disconnected' });
             return;
        }

        if (accepted) {
            console.log(`${opponentInfo.name} accepted challenge from ${challengerInfo.name}. Starting challenge.`);
            // Prepare data needed by startGame
            const player1Data = { userId: challengerId, name: challengerInfo.name, socketId: challengerInfo.socketId };
            const player2Data = { userId: opponentId, name: opponentInfo.name, socketId: socket.id }; // Use current socket for opponent
            await startGame(player1Data, player2Data); // Call the centralized function
        } else {
            console.log(`${opponentInfo.name} rejected challenge from ${challengerInfo.name}.`);
            io.to(challengerInfo.socketId).emit('challenge_rejected', { opponentId: opponentId, opponentName: opponentInfo.name });
        }
    });

     // Submit Solution Handler (Remains the same)
     socket.on('submit_solution', async (data) => {
         const { gameId, solution } = data;
         const playerId = currentUserId;
         if (!playerId) return console.error("Solution submitted by unknown user.");

         const game = activeGames[gameId];
         if (!game || game.status !== 'in_progress') {
             socket.emit('solution_result', { gameId, round: game ? game.currentRound + 1 : -1, status: 'invalid', reason: game ? 'challenge_not_active' : 'challenge_over' });
             return;
         }
         const currentRoundData = game.rounds[game.currentRound];
         if (!currentRoundData || currentRoundData.endedReason) {
             socket.emit('solution_result', { gameId, round: game.currentRound + 1, status: 'invalid', reason: 'round_over' });
             return;
         }

         let playerKey = null;
         if (game.player1Id === playerId) playerKey = 'player1';
         else if (game.player2Id === playerId) playerKey = 'player2';
         else return console.error(`Player ${playerId} submitted for challenge ${gameId} they are not part of.`);

         if (currentRoundData[playerKey].solution !== null) {
             socket.emit('solution_result', { gameId, round: game.currentRound + 1, status: 'invalid', reason: 'already_submitted_this_round' });
             return;
         }

         const submissionTime = new Date();
         const timeTakenMs = submissionTime - new Date(currentRoundData.startTime); // Ensure startTime is Date object
         currentRoundData[playerKey].solution = solution;
         currentRoundData[playerKey].timeTakenMs = timeTakenMs;

         console.log(`Player ${playerId} submitted solution '${solution}' for round ${currentRoundData.roundNumber} (Time: ${timeTakenMs}ms)`);
         const validation = validateHectocSolution(currentRoundData.puzzle, solution);
         currentRoundData[playerKey].correct = validation.isValid;

         socket.emit('solution_result', { // Emit result regardless of correctness
             gameId,
             round: currentRoundData.roundNumber,
             status: validation.isValid ? 'correct' : 'incorrect',
             reason: validation.isValid ? null : validation.reason,
             details: validation.error,
             timeTakenMs: timeTakenMs
         });

         if (validation.isValid) {
             console.log(`Solution CORRECT for round ${currentRoundData.roundNumber} by ${playerId}! Ending round.`);
             await handleRoundEnd(gameId, playerId, 'solved');
         } else {
             console.log(`Solution INCORRECT for round ${currentRoundData.roundNumber} by ${playerId} (${validation.reason}).`);
             // Game continues until timeout, other player solves, or all rounds finished
         }
     });


    // --- <<< NEW Matchmaking Event Handlers >>> ---
    socket.on('enter_matchmaking', () => {
        if (!currentUserId || !onlineUsers[currentUserId]) {
            console.error(`[Matchmaking] 'enter_matchmaking' from unknown/offline user (socket ${socket.id}).`);
            return socket.emit('matchmaking_failed', { reason: 'not_logged_in' });
        }
        // Check if user is already in a game
        const isInGame = Object.values(activeGames).some(g => g.player1Id === currentUserId || g.player2Id === currentUserId);
        if (isInGame) {
            console.log(`[Matchmaking] User ${currentUserId} tried queue but is in game.`);
            return socket.emit('matchmaking_failed', { reason: 'already_in_game' });
        }
        // Check if user is already in the queue
        const isInQueue = matchmakingQueue.some(user => user.userId === currentUserId);
        if (isInQueue) {
            console.log(`[Matchmaking] User ${currentUserId} already in queue.`);
            return socket.emit('searching_for_match'); // Re-confirm status
        }
        // Add user to queue
        const userInfo = {
            userId: currentUserId,
            name: onlineUsers[currentUserId].name,
            socketId: socket.id // Essential: Use the current socket ID
        };
        matchmakingQueue.push(userInfo);
        console.log(`[Matchmaking] User ${userInfo.name} entered queue. Queue: [${matchmakingQueue.map(u=>u.name).join(', ')}]`);
        socket.emit('searching_for_match'); // Notify client
        tryMatchmaking(); // Attempt to match
    });

    socket.on('leave_matchmaking', () => {
         if (!currentUserId) return;
         const initialQueueLength = matchmakingQueue.length;
         matchmakingQueue = matchmakingQueue.filter(user => !(user.userId === currentUserId && user.socketId === socket.id)); // Remove by ID and socket
         if (matchmakingQueue.length < initialQueueLength) {
             console.log(`[Matchmaking] User ${currentUserId} left queue. Queue: [${matchmakingQueue.map(u=>u.name).join(', ')}]`);
             socket.emit('left_matchmaking');
         } else {
             console.log(`[Matchmaking] User ${currentUserId} tried to leave but not found in queue.`);
         }
    });
    // --- <<< END NEW >>> ---

}); // End io.on('connection')

// === Server Start ===
app.get("/", (req, res) => res.send("API is running..."));
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));