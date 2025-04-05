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
        // Allow digits in any order for flexibility? Or strict order? Sticking to strict for now.
        const sortedPuzzle = puzzle.split('').sort().join('');
        const sortedSolutionDigits = solutionDigits.split('').sort().join('');
        // if (solutionDigits !== puzzle) { // Original strict order check
        if (sortedSolutionDigits !== sortedPuzzle || solutionDigits.length !== 6) { // Check if same digits are used, length 6
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

// --- Core Game Flow Functions ---

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
        // Include correct solution if solved? Requires storing it if validation passed.
        // correctSolution: (reason === 'solved') ? winningSolution : null // Need to get the winning solution
    };
    
    // Temporary fix: Add puzzle to payload for context
    roundResultPayload.puzzle = currentRoundData.puzzle; 

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
    const durationSeconds = Math.round((endTime - game.startTime) / 1000);

    // Determine overall winner/loser
    let challengeWinnerId = null;
    let challengeLoserId = null;
    let isDraw = false;

    if (finalStatus !== 'abandoned' && finalStatus !== 'error') { // Don't calculate winner if abandoned/error
        if (game.player1Score > game.player2Score) {
            challengeWinnerId = game.player1Id;
            challengeLoserId = game.player2Id;
        } else if (game.player2Score > game.player1Score) {
            challengeWinnerId = game.player2Id;
            challengeLoserId = game.player1Id;
        } else {
            isDraw = true;
            // Both players can be considered non-winners/non-losers in a draw
        }
    } else if (finalStatus === 'abandoned') {
        // If abandoned, the one who didn't disconnect wins
        // This logic is handled in the disconnect handler which calls this function
        challengeWinnerId = reason === game.player1Id ? game.player2Id : game.player1Id; // reason holds the abandoner's ID here
        challengeLoserId = reason;
        finalStatus = 'abandoned'; // Ensure status reflects abandonment
        reason = 'player_disconnected'; // More specific reason
    }


    try {
        // --- Persist Final Game Result ---
        await Game.findOneAndUpdate(
            { gameId: gameId },
            {
                $set: {
                    status: finalStatus,
                    endTime: endTime,
                    // durationSeconds: durationSeconds, // Not in schema, createdAt/updatedAt available
                    rounds: game.rounds, // Save all collected round data
                    player1Score: game.player1Score,
                    player2Score: game.player2Score,
                    challengeWinnerId: challengeWinnerId,
                    challengeLoserId: challengeLoserId,
                    currentRound: game.currentRound // Save final round state
                }
            },
            { new: true }
        );
        console.log(`[DB] Challenge ${gameId} final state saved. Status: ${finalStatus}, Winner: ${challengeWinnerId || 'Draw'}`);

        // --- Update Player Stats & Points ---
        const updatePromises = [];
        if (challengeWinnerId && challengeLoserId) { // Normal win/loss or abandon
            updatePromises.push(User.findByIdAndUpdate(challengeWinnerId, {
                $inc: { wins: 1, totalGamesPlayed: 1, points: POINTS_PER_WIN }
            }).catch(err => console.error(`[DB] Error updating winner ${challengeWinnerId} stats:`, err)));
            updatePromises.push(User.findByIdAndUpdate(challengeLoserId, {
                $inc: { losses: 1, totalGamesPlayed: 1, points: POINTS_PER_LOSS } // Deduct points for loss
            }).catch(err => console.error(`[DB] Error updating loser ${challengeLoserId} stats:`, err)));
        } else if (isDraw) { // Draw scenario
             if (game.player1Id) updatePromises.push(User.findByIdAndUpdate(game.player1Id, {
                $inc: { draws: 1, totalGamesPlayed: 1, points: POINTS_PER_DRAW }
            }).catch(err => console.error(`[DB] Error updating player ${game.player1Id} stats (draw):`, err)));
             if (game.player2Id) updatePromises.push(User.findByIdAndUpdate(game.player2Id, {
                $inc: { draws: 1, totalGamesPlayed: 1, points: POINTS_PER_DRAW }
            }).catch(err => console.error(`[DB] Error updating player ${game.player2Id} stats (draw):`, err)));
        } // Don't update stats on 'error' status? Or maybe count as loss/draw? TBD.

        await Promise.all(updatePromises);
        console.log(`[DB] Stats and points update attempted for players in challenge ${gameId}.`);

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
            // Check if user is already listed with a different socket ID (reconnection)
            if (onlineUsers[userId] && onlineUsers[userId].socketId !== socket.id) {
                console.log(`User ${userId} reconnected with new socket ${socket.id}. Old: ${onlineUsers[userId].socketId}`);
                 // Maybe notify the old socket it's being replaced? (Advanced)
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

        // Find which user this socket belonged to
        for (const userId in onlineUsers) {
            if (onlineUsers[userId].socketId === socket.id) {
                userIdToCleanup = userId;
                break;
            }
        }

        if (userIdToCleanup) {
            console.log(`Disconnecting user: ${onlineUsers[userIdToCleanup]?.name} (${userIdToCleanup})`);

             // --- Handle disconnect during active game (Forfeit) ---
             // Need to find the game based on the *userId*, not currentUserId which might be stale
             const gameToEnd = Object.values(activeGames).find(g => g.player1Id === userIdToCleanup || g.player2Id === userIdToCleanup);

             if (gameToEnd && gameToEnd.status === 'in_progress') {
                 console.log(`User ${userIdToCleanup} disconnected during challenge ${gameToEnd.gameId}. Ending challenge.`);
                 // Pass the ID of the player who disconnected as the 'reason' for endChallenge
                 await endChallenge(gameToEnd.gameId, 'abandoned', userIdToCleanup);
             }
             // --- End Game Handling ---

            delete onlineUsers[userIdToCleanup];
            app.set('onlineUsers', onlineUsers);
            io.sockets.server.settings.onlineUsers = onlineUsers; // Update io state
            await emitOnlineUsersUpdate(); // Notify others
        } else {
            console.log(`Socket ${socket.id} disconnected without a tracked online user.`);
        }
         // Reset currentUserId specific to this closed socket context
         currentUserId = null;
    });

    socket.on("heartbeat", (userId) => {
        // Basic heartbeat check, could be expanded
        if (userId && onlineUsers[userId]) {
             // console.log(`Heartbeat received from ${userId}`);
             if (onlineUsers[userId].socketId !== socket.id) {
                 // console.log(`Heartbeat from ${userId} on new socket ${socket.id}, updating.`);
                 onlineUsers[userId].socketId = socket.id; // Update socket ID if user reconnected
             }
        }
    });


    // --- Game Logic Events ---

    // 1. Challenge Initiation (No changes needed here)
    socket.on('challenge_user', (data) => {
        const { opponentUserId } = data;
        const challengerId = currentUserId; // Use ID tracked for this socket

        if (!challengerId) return console.error("Challenge attempt from unknown user (socket not fully registered?).");
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

    // 2. Challenge Response -> Start Game (Modified for Rounds)
    socket.on('respond_challenge', async (data) => {
        const { challengerId, accepted } = data;
        const opponentId = currentUserId; // The user responding

        if (!opponentId) return console.error("Response from unknown user.");

        const challenger = onlineUsers[challengerId];
        const opponent = onlineUsers[opponentId];

        if (!challenger || !challenger.socketId || !opponent) {
            console.error(`Cannot process response: Challenger ${challengerId} or Opponent ${opponentId} info missing.`);
            // Notify challenger if possible
             if (challenger?.socketId) {
                 io.to(challenger.socketId).emit('challenge_failed', { reason: 'opponent_info_missing' });
             }
            return;
        }

        const challengerSocket = io.sockets.sockets.get(challenger.socketId);
        if (!challengerSocket) {
             console.error(`Cannot process response: Challenger socket ${challenger.socketId} not found (maybe disconnected).`);
             // Notify responder (opponent)
             socket.emit('challenge_failed', { reason: 'challenger_disconnected' });
             return;
        }


        if (accepted) {
            console.log(`${opponent.name} accepted challenge from ${challenger.name}. Starting challenge.`);
            const gameId = uuidv4();
            const firstPuzzle = generateHectocPuzzleSafe();
            const startTime = new Date(); // Challenge start time

            if (!firstPuzzle) {
                console.error("[Game Start] CRITICAL: Failed to generate first Hectoc puzzle.");
                io.to(challenger.socketId).to(socket.id).emit('game_start_failed', { reason: 'server_puzzle_error' });
                return;
            }

             const firstRoundStartTime = new Date(); // Round 1 start time
            // Store initial game details in memory
             activeGames[gameId] = {
                 gameId: gameId,
                 player1Id: challengerId,
                 player2Id: opponentId,
                 player1: { userId: challengerId, name: challenger.name, socketId: challenger.socketId },
                 player2: { userId: opponentId, name: opponent.name, socketId: socket.id },
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

            // Create game record in DB
            try {
                await Game.create({
                    gameId: gameId,
                    player1: { userId: challengerId, name: challenger.name },
                    player2: { userId: opponentId, name: opponent.name },
                    // puzzle: firstPuzzle, // Removed - puzzles are in rounds array
                    startTime: startTime,
                    overallTimeLimitSeconds: OVERALL_GAME_TIME_LIMIT_SECONDS,
                    roundTimeLimitSeconds: ROUND_TIME_LIMIT_SECONDS,
                    status: 'in_progress',
                    currentRound: 0,
                    rounds: [{ // Store first round stub in DB as well
                        roundNumber: 1,
                        puzzle: firstPuzzle,
                        startTime: firstRoundStartTime,
                         // Keep player solutions/times null initially in DB
                    }]
                });
                console.log(`[DB] Game ${gameId} created in DB.`);
            } catch(dbError) {
                console.error(`[DB Error] Failed to create game ${gameId} in DB:`, dbError);
                io.to(challenger.socketId).to(opponent.socketId).emit('game_start_failed', { reason: 'server_db_error'});
                delete activeGames[gameId]; // Clean up in-memory state
                return;
            }

            // Make both players join the Socket.IO room
            challengerSocket.join(gameId);
            socket.join(gameId);
            console.log(`Sockets for ${challenger.name} and ${opponent.name} joined room ${gameId}`);

            // Set timers
            const game = activeGames[gameId];
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


             // Emit 'challenge_start' event (renamed from game_start)
             const challengeStartData = {
                 gameId: gameId,
                 totalRounds: TOTAL_ROUNDS,
                 roundTimeLimitSeconds: game.roundTimeLimitSeconds,
                 overallTimeLimitSeconds: game.overallTimeLimitSeconds,
                 player1: { id: challengerId, name: challenger.name },
                 player2: { id: opponentId, name: opponent.name },
                 // Initial round data
                 currentRound: 1,
                 puzzle: firstPuzzle,
                 player1Score: 0,
                 player2Score: 0
             };
             io.to(gameId).emit('challenge_start', challengeStartData);
             console.log(`Emitted challenge_start for game ${gameId}`);


        } else {
            console.log(`${opponent.name} rejected challenge from ${challenger.name}.`);
            io.to(challenger.socketId).emit('challenge_rejected', { opponentId: opponentId, opponentName: opponent.name });
        }
    });

     // 3. Submit Solution (Modified for Rounds)
     socket.on('submit_solution', async (data) => {
         const { gameId, solution } = data;
         const playerId = currentUserId;

         if (!playerId) return console.error("Solution submitted by unknown user.");

         const game = activeGames[gameId];
         // Basic validation
         if (!game) {
             console.log(`Solution submitted for inactive/ended challenge ${gameId} by ${playerId}.`);
             socket.emit('solution_result', { gameId, round: -1, status: 'invalid', reason: 'challenge_over' });
             return;
         }
         if (game.status !== 'in_progress') {
             console.log(`Solution submitted for non-active challenge ${gameId} by ${playerId}. Status: ${game.status}`);
             socket.emit('solution_result', { gameId, round: game.currentRound + 1, status: 'invalid', reason: 'challenge_not_active' });
             return;
         }

         const currentRoundData = game.rounds[game.currentRound];
         if (!currentRoundData || currentRoundData.endedReason) {
             console.log(`Solution submitted for already ended round ${game.currentRound + 1} in challenge ${gameId} by ${playerId}.`);
             socket.emit('solution_result', { gameId, round: game.currentRound + 1, status: 'invalid', reason: 'round_over' });
             return;
         }

         // Identify which player submitted
         let playerKey = null;
         if (game.player1Id === playerId) playerKey = 'player1';
         else if (game.player2Id === playerId) playerKey = 'player2';
         else {
             console.error(`Player ${playerId} submitted for challenge ${gameId} they are not part of.`);
             return; // Should not happen if logic is correct
         }

         // Prevent submitting multiple times *in the same round*
         if (currentRoundData[playerKey].solution !== null) {
             console.log(`Player ${playerId} already submitted for round ${game.currentRound + 1} in challenge ${gameId}.`);
             socket.emit('solution_result', { gameId, round: game.currentRound + 1, status: 'invalid', reason: 'already_submitted_this_round' });
             return;
         }

         // Record submission attempt details
         const submissionTime = new Date();
         const timeTakenMs = submissionTime - currentRoundData.startTime;
         currentRoundData[playerKey].solution = solution;
         currentRoundData[playerKey].timeTakenMs = timeTakenMs;

         console.log(`Player ${playerId} submitted solution '${solution}' for round ${currentRoundData.roundNumber} (Time: ${timeTakenMs}ms)`);

         // Validate the solution
         const validation = validateHectocSolution(currentRoundData.puzzle, solution);
         currentRoundData[playerKey].correct = validation.isValid;

         if (validation.isValid) {
             console.log(`Solution CORRECT for round ${currentRoundData.roundNumber} by ${playerId}! Ending round.`);
             // Emit success *before* ending the round (gives immediate feedback)
             socket.emit('solution_result', {
                 gameId,
                 round: currentRoundData.roundNumber,
                 status: 'correct',
                 timeTakenMs: timeTakenMs
             });
             // End the round, declaring this player the winner
             await handleRoundEnd(gameId, playerId, 'solved');

         } else {
             console.log(`Solution INCORRECT for round ${currentRoundData.roundNumber} by ${playerId} (${validation.reason}).`);
             // Notify only the submitting player their solution was wrong
             socket.emit('solution_result', {
                 gameId,
                 round: currentRoundData.roundNumber,
                 status: 'incorrect',
                 reason: validation.reason,
                 details: validation.error, // Optional error details
                 timeTakenMs: timeTakenMs
             });
             // NOTE: Game continues. The *other* player might still solve it, or the round might time out.
             // We recorded the incorrect attempt.
         }
     });

}); // End io.on('connection')

// === Server Start ===
app.get("/", (req, res) => res.send("API is running..."));

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));