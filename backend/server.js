const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./src/config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");  // Add this line to import userRoutes
const http = require("http");
const { Server } = require("socket.io");
const User = require("./models/User"); // Import the User model
const { v4: uuidv4 } = require('uuid'); // For generating unique game IDs
const math = require('mathjs'); // For safe expression evaluation

const Game = require("./models/Game"); // Import Game model


const friendRoutes = require('./routes/friendRoutes'); // Import the factory function
const leaderboardRoutes = require('./routes/leaderboardRoutes'); 
// Make sure the path is correct relative to server.js
const HectocGenerator = require('./utility/HectocGenerator');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",  // Allow all origins (for now, change in production)
        methods: ["GET", "POST"],
    },
});



// === State Management ===
// Store online users
let onlineUsers = {}; // { userId: { socketId: socket.id, name: user.name } } <= Store name too!
let activeGames = {}; // { gameId: { player1Id, player2Id, puzzle, startTime, timerId, timeLimitSeconds } }
const GAME_TIME_LIMIT_SECONDS = 300; // Game duration

const POINTS_PER_WIN = 10; // Points awarded for a win
// const POINTS_PER_LOSS = -5; // Optional: Define points deducted for a loss
// const POINTS_PER_DRAW = 0;  // Optional: Points for a draw

// Share onlineUsers with Express routes
app.set('onlineUsers', onlineUsers);

io.sockets.server.settings = { onlineUsers: onlineUsers }; // A way to make it accessible

app.use(cors());
app.use(bodyParser.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);  // Add this line to use userRoutes
app.use("/api/friends", friendRoutes(io)); // Initialize friend routes with io instance
app.use("/api/leaderboard", leaderboardRoutes);

// Helper function to get user details for online users
async function getOnlineUserDetails() {
    const onlineUserIds = Object.keys(onlineUsers);
    if (onlineUserIds.length === 0) {
        return [];
    }
    try {
        // Fetch user details directly from DB
        const users = await User.find({ _id: { $in: onlineUserIds } })
                                .select("_id name playerId"); // Select necessary fields
        return users;
    } catch (err) {
        console.error("Error fetching online user details:", err);
        return []; // Return empty on error
    }
}

// Function to emit the updated list
async function emitOnlineUsersUpdate() {
    const userDetails = await getOnlineUserDetails();
    console.log("Emitting update-online-users with details:", userDetails); // For debugging
    io.emit("update-online-users", userDetails); // Emit array of user objects
}

                // Generate Hectoc Puzzle
                // function generateHectocPuzzle() {
                //     let puzzle = '';
                //     for (let i = 0; i < 6; i++) {
                //         puzzle += Math.floor(Math.random() * 9) + 1; // Digits 1-9
                //     }
                //     return puzzle;
                // }

                /**
                 * Validates a Hectoc solution attempt against the puzzle.
                 * Checks if the correct set of digits were used and if the expression evaluates to 100.
                 * @param {string} puzzle - The 6-digit puzzle string.
                 * @param {string} solution - The player's solution expression.
                 * @returns {{isValid: boolean, reason?: string, result?: number, error?: string}} Validation result.
                 **/

                

                // Validate Hectoc Solution (Safely)
                function validateHectocSolution(puzzle, solution) {
                    if (!solution || typeof solution !== 'string' || solution.trim() === '') {
                        return { isValid: false, reason: 'empty_solution' };
                    }
                    try {
                        const solutionDigits = solution.replace(/[^1-9]/g, '');
                        if (solutionDigits !== puzzle) {
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

                // Function to end a game, update DB, and notify clients
                async function endGame(gameId, winnerId, loserId, status, reason = "completed", player1Solution = null, player2Solution = null) {
                    console.log(`Ending game ${gameId}. Status: ${status}, Reason: ${reason}, Winner: ${winnerId}`);
                    const game = activeGames[gameId];
                    if (!game) {
                        console.error(`Attempted to end non-existent or already ended game: ${gameId}`);
                        return; // Game already ended or doesn't exist
                    }

                    // Clear timeout timer if it exists
                    if (game.timerId) {
                        clearTimeout(game.timerId);
                    }

                    const endTime = new Date();
                    const durationSeconds = Math.round((endTime - game.startTime) / 1000);

                    try {
                        // --- Persist Game Result ---
                        await Game.findOneAndUpdate(
                            { gameId: gameId },
                            {
                                $set: {
                                    winnerId: winnerId,
                                    loserId: loserId,
                                    status: status,
                                    endTime: endTime,
                                    durationSeconds: durationSeconds,
                                    "player1.solution": player1Solution ?? game.player1?.solution, // Store submitted solution
                                    "player2.solution": player2Solution ?? game.player2?.solution
                                }
                            },
                            { new: true } // Option to return the updated doc if needed
                        );
                        console.log(`Game ${gameId} saved to DB with status ${status}.`);

                        // --- Update Player Stats ---
                    //     const updatePromises = [];
                    //     if (winnerId && loserId) { // Normal win/loss or abandon
                    //         updatePromises.push(
                    //             User.findByIdAndUpdate(winnerId, { $inc: { wins: 1, totalGamesPlayed: 1 , points: POINTS_PER_WIN } })
                    //         );
                    //         updatePromises.push(
                    //             User.findByIdAndUpdate(loserId, { $inc: { losses: 1, totalGamesPlayed: 1 /*, points: POINTS_PER_LOSS */ } })
                    //         );
                    //     } else if (status === 'timeout' || status === 'completed_draw') { // Draw scenario
                    //         updatePromises.push(
                    //             User.findByIdAndUpdate(game.player1Id, { $inc: { draws: 1, totalGamesPlayed: 1 } })
                    //         );
                    //         updatePromises.push(
                    //             User.findByIdAndUpdate(game.player2Id, { $inc: { draws: 1, totalGamesPlayed: 1 } })
                    //         );
                    //     }
                    //     await Promise.all(updatePromises);
                    //     console.log(`Stats updated for players in game ${gameId}.`);

                    // } catch (dbError) {
                    //     console.error(`Database error ending game ${gameId}:`, dbError);
                    //     // Decide how to handle DB errors - maybe retry later? For hackathon, log and continue cleanup.
                    // }

                     // Update Player Stats & Points
                    const updatePromises = [];
                    if (winnerId && loserId) {
                        // Winner gets points
                        updatePromises.push(User.findByIdAndUpdate(winnerId, {
                            $inc: { wins: 1, totalGamesPlayed: 1, points: POINTS_PER_WIN } // Add points for win
                        }).catch(err => console.error(`[DB] Error updating winner ${winnerId} stats/points:`, err)));
                        // Loser (optional points change)
                        updatePromises.push(User.findByIdAndUpdate(loserId, {
                            $inc: { losses: 1, totalGamesPlayed: 1 /*, points: POINTS_PER_LOSS */ } // Optional point deduction
                        }).catch(err => console.error(`[DB] Error updating loser ${loserId} stats/points:`, err)));
                    } else if (status === 'timeout' || status === 'completed_draw') {
                        // Draw (optional points change)
                        if (game.player1Id) updatePromises.push(User.findByIdAndUpdate(game.player1Id, {
                            $inc: { draws: 1, totalGamesPlayed: 1 /*, points: POINTS_PER_DRAW */ }
                        }).catch(err => console.error(`[DB] Error updating player ${game.player1Id} stats/points (draw):`, err)));
                        if (game.player2Id) updatePromises.push(User.findByIdAndUpdate(game.player2Id, {
                            $inc: { draws: 1, totalGamesPlayed: 1 /*, points: POINTS_PER_DRAW */ }
                        }).catch(err => console.error(`[DB] Error updating player ${game.player2Id} stats/points (draw):`, err)));
                    }
                    await Promise.all(updatePromises);
                    console.log(`[DB] Stats and points update attempted for players in game ${gameId}.`);

                    } catch (dbError) {
                        console.error(`[DB] Database error during endGame operations for ${gameId}:`, dbError);
                    }

                    // Modify the payload creation inside endGame function:
                    const payload = {
                        gameId, winnerId, loserId, reason, status,
                        // Send structured player info including solutions
                        player1Info: { id: game.player1Id, solution: game.player1.solution },
                        player2Info: { id: game.player2Id, solution: game.player2.solution }
                    };
                    console.log(`[GameHandler] Emitting game_over to room ${gameId}:`, payload);
                    io.to(gameId).emit('game_over', payload);

                    // --- Clean Up Server State ---
                    // Make sockets leave the room
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
            // === Socket.IO Connection Logic ===
            io.on("connection", (socket) => {
                console.log(`User connected: ${socket.id}`);
                let currentUserId = null; // User ID for this socket connection

                // --- User Online/Offline Handling ---
                socket.on("user-online", async (userId) => {
                    if (!userId) return;
                    try {
                        const user = await User.findById(userId).select("name"); // Fetch user's name
                        if (!user) {
                            console.warn(`User ${userId} not found in DB during user-online event.`);
                            return;
                        }

                        console.log(`User online: ${user.name} (${userId}) on socket ${socket.id}`);
                        currentUserId = userId;
                        onlineUsers[userId] = { socketId: socket.id, name: user.name }; // Store socketId and name
                        app.set('onlineUsers', onlineUsers);

                        io.sockets.server.settings.onlineUsers = onlineUsers; // Update io state

                        await emitOnlineUsersUpdate();
                    } catch (err) {
                        console.error(`Error fetching user ${userId} on connect:`, err);
                    }
                });

                // socket.on("disconnect", async (reason) => {
                //     console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
                //     if (currentUserId && onlineUsers[currentUserId]?.socketId === socket.id) {
                //         console.log(`Removing user ${currentUserId} (${onlineUsers[currentUserId]?.name}) from online list.`);

                //         // --- Handle disconnect during active game (Forfeit) ---
                //         const gameToEnd = Object.values(activeGames).find(g => g.player1Id === currentUserId || g.player2Id === currentUserId);
                //         if (gameToEnd) {
                //             console.log(`User ${currentUserId} disconnected during game ${gameToEnd.gameId}. Ending game.`);
                //             const winner = gameToEnd.player1Id === currentUserId ? gameToEnd.player2Id : gameToEnd.player1Id;
                //             const loser = currentUserId;
                //             await endGame(gameToEnd.gameId, winner, loser, 'abandoned', 'opponent_disconnected');
                //         }
                //         // --- End Game Handling ---

                //         delete onlineUsers[currentUserId];
                //         app.set('onlineUsers', onlineUsers);
                //         await emitOnlineUsersUpdate(); // Notify others
                //     } else {
                //         console.log(`Socket ${socket.id} disconnected without a tracked userId.`);
                //         // Optional: Iterate onlineUsers to double-check if any user has this socket.id
                //         const userIdToDelete = Object.keys(onlineUsers).find(id => onlineUsers[id]?.socketId === socket.id);
                //         if (userIdToDelete) {
                //             console.log(`Found and removing dangling user ${userIdToDelete} on disconnect.`);
                //             delete onlineUsers[userIdToDelete];
                //             app.set('onlineUsers', onlineUsers);
                //             await emitOnlineUsersUpdate();
                //         }
                //     }
                //     currentUserId = null;
                // });

                //SOcket disconnection logic
                // --- Modify Socket.IO disconnect logic ---
                socket.on("disconnect", async (reason) => {
                    console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
                    if (currentUserId && onlineUsers[currentUserId]?.socketId === socket.id) {
                        console.log(`Removing user ${currentUserId} (${onlineUsers[currentUserId]?.name}) from online list.`);

                        // --- Handle disconnect during active game (Forfeit) ---
                        const gameToEnd = Object.values(activeGames).find(g => g.player1Id === currentUserId || g.player2Id === currentUserId);
                        if (gameToEnd) {
                            console.log(`User ${currentUserId} disconnected during game ${gameToEnd.gameId}. Ending game.`);
                            const winner = gameToEnd.player1Id === currentUserId ? gameToEnd.player2Id : gameToEnd.player1Id;
                            const loser = currentUserId;
                            await endGame(gameToEnd.gameId, winner, loser, 'abandoned', 'opponent_disconnected');
                        }
                        // --- End Game Handling ---

                        console.log(`Removing user ${currentUserId} (${onlineUsers[currentUserId]?.name}) from online list.`);
                        delete onlineUsers[currentUserId];

                        app.set('onlineUsers', onlineUsers);
                        io.sockets.server.settings.onlineUsers = onlineUsers; // Update io state
                        await emitOnlineUsersUpdate(); // Notify others
                    } else {
                        console.log(`Socket ${socket.id} disconnected without a tracked userId.`);
                        // Optional: Iterate onlineUsers to double-check if any user has this socket.id
                        const userIdToDelete = Object.keys(onlineUsers).find(id => onlineUsers[id]?.socketId === socket.id);
                        if (userIdToDelete) {
                            console.log(`Found and removing dangling user ${userIdToDelete} on disconnect.`);
                            delete onlineUsers[userIdToDelete];
                            app.set('onlineUsers', onlineUsers);

                            io.sockets.server.settings.onlineUsers = onlineUsers;

                            await emitOnlineUsersUpdate();
                        }
                    }
                    currentUserId = null;
                });

                socket.on("heartbeat", (userId) => {
                    if (userId && onlineUsers[userId]) {
                        // console.log(`Heartbeat from ${userId}`);
                        onlineUsers[userId].socketId = socket.id; // Update socket id if it changed (though unlikely)
                    }
                });


                // --- Game Logic Events ---

                // 1. Challenge Initiation
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
                        // Optionally emit back to challenger that opponent is offline/unavailable
                        socket.emit('challenge_failed', { reason: 'opponent_offline' });
                    }
                });

                // 2. Challenge Response
                socket.on('respond_challenge', async (data) => {
                    const { challengerId, accepted } = data;
                    const opponentId = currentUserId; // The user responding is the opponent

                    if (!opponentId) return console.error("Response from unknown user.");

                    const challenger = onlineUsers[challengerId];
                    const opponent = onlineUsers[opponentId];

                    if (!challenger || !challenger.socketId || !opponent) {
                        console.error(`Cannot process response: Challenger ${challengerId} or Opponent ${opponentId} info missing.`);
                        return;
                    }

                    const challengerSocket = io.sockets.sockets.get(challenger.socketId);
                    if (!challengerSocket) {
                        console.error(`Cannot process response: Challenger socket ${challenger.socketId} not found.`);
                        return;
                    }


                    if (accepted) {
                        console.log(`${opponent.name} accepted challenge from ${challenger.name}. Starting game.`);
                        const gameId = uuidv4(); // Unique ID for this game session/room
                        
                        //// const puzzle = generateHectocPuzzle();
                        
                        let puzzle = null;
                        try {
                            // *** CORRECTED: Use the imported HectocGenerator ***
                            const challengeObject = HectocGenerator.generate(); // Returns HectocChallenge object
                            puzzle = challengeObject.toString(); // Get the puzzle string
                        } catch (puzzleError) {
                            console.error("[Game Start] CRITICAL: Failed to generate Hectoc puzzle:", puzzleError);
                            io.to(challenger.socketId).to(socket.id).emit('game_start_failed', { reason: 'server_puzzle_error' });
                            return;
                        }
                        const startTime = new Date();

                        // Store initial game details in memory
                        activeGames[gameId] = {
                            gameId: gameId,
                            player1Id: challengerId,
                            player2Id: opponentId,
                            puzzle: puzzle,
                            startTime: startTime,
                            timeLimitSeconds: GAME_TIME_LIMIT_SECONDS,
                            player1: { userId: challengerId, name: challenger.name, socketId: challenger.socketId },
                            player2: { userId: opponentId, name: opponent.name, socketId: socket.id },
                            timerId: null // Will be set below
                        };

                        // Create game record in DB (status: in_progress)
                        try {
                            await Game.create({
                                gameId: gameId,
                                player1: { userId: challengerId, name: challenger.name },
                                player2: { userId: opponentId, name: opponent.name },
                                puzzle: puzzle,
                                startTime: startTime,
                                timeLimitSeconds: GAME_TIME_LIMIT_SECONDS,
                                status: 'in_progress'
                            });
                            console.log(`Game ${gameId} created in DB.`);
                        } catch(dbError) {
                            console.error(`Failed to create game ${gameId} in DB:`, dbError);
                            // Notify players that game couldn't start
                            io.to(challenger.socketId).to(opponent.socketId).emit('game_start_failed', { reason: 'server_error'});
                            delete activeGames[gameId]; // Clean up in-memory state
                            return;
                        }


                        // Make both players join the Socket.IO room
                        challengerSocket.join(gameId);
                        socket.join(gameId); // The opponent's socket
                        console.log(`Sockets for ${challenger.name} and ${opponent.name} joined room ${gameId}`);


                        // Set game timeout timer
                        activeGames[gameId].timerId = setTimeout(async () => {
                            console.log(`Game ${gameId} timed out.`);
                            // Check if game still exists (wasn't ended by solution/disconnect)
                            if (activeGames[gameId]) {
                                await endGame(gameId, null, null, 'timeout', 'timeout');
                            }
                        }, GAME_TIME_LIMIT_SECONDS * 1000);

                        // Emit 'game_start' event to both players in the room
                        const gameStartData = {
                            gameId: gameId,
                            puzzle: puzzle,
                            timeLimitSeconds: GAME_TIME_LIMIT_SECONDS,
                            // Send opponent details to each player
                            player1: { id: challengerId, name: challenger.name },
                            player2: { id: opponentId, name: opponent.name }
                        };
                        io.to(gameId).emit('game_start', gameStartData);
                        console.log(`Emitted game_start for game ${gameId}`);


                    } else {
                        console.log(`${opponent.name} rejected challenge from ${challenger.name}.`);
                        // Notify the challenger that the challenge was rejected
                        io.to(challenger.socketId).emit('challenge_rejected', { opponentId: opponentId, opponentName: opponent.name });
                    }
                });

                // 3. Submit Solution
                socket.on('submit_solution', async (data) => {
                    const { gameId, solution } = data;
                    const playerId = currentUserId;

                    if (!playerId) return console.error("Solution submitted by unknown user.");

                    const game = activeGames[gameId];
                    if (!game) {
                        console.log(`Solution submitted for inactive/ended game ${gameId} by ${playerId}. Ignoring.`);
                        // Optionally notify client the game is over if they try to submit late
                        socket.emit('solution_invalid', { gameId, reason: 'game_already_over' });
                        return;
                    }

                    // Prevent submitting multiple times (basic check)
                    if ((game.player1Id === playerId && game.player1.solution) || (game.player2Id === playerId && game.player2.solution)) {
                        console.log(`Player ${playerId} already submitted a solution for game ${gameId}. Ignoring.`);
                        socket.emit('solution_invalid', { gameId, reason: 'already_submitted' });
                        return;
                    }

                    // Store submitted solution temporarily
                    let playerKey = null;
                    if (game.player1Id === playerId) {
                        game.player1.solution = solution;
                        playerKey = 'player1';
                    } else if (game.player2Id === playerId) {
                        game.player2.solution = solution;
                        playerKey = 'player2';
                    } else {
                        console.error(`Player ${playerId} tried to submit for game ${gameId} they are not part of.`);
                        return; // Player not in this game
                    }


                    console.log(`Player ${playerId} submitted solution '${solution}' for game ${gameId}`);

                    const validation = validateHectocSolution(game.puzzle, solution);

                    if (validation.isValid) {
                        console.log(`Solution for game ${gameId} by ${playerId} is CORRECT! Ending game.`);
                        // Determine winner/loser
                        const winnerId = playerId;
                        const loserId = (game.player1Id === winnerId) ? game.player2Id : game.player1Id;

                        // End the game, update DB, notify clients
                        await endGame(gameId, winnerId, loserId, 'completed_win', 'correct_solution', game.player1.solution, game.player2.solution);

                    } else {
                        console.log(`Solution for game ${gameId} by ${playerId} is INCORRECT (${validation.reason}).`);
                        // Notify only the submitting player their solution was wrong
                        socket.emit('solution_invalid', {
                            gameId,
                            reason: validation.reason,
                            details: validation.error // Optional: send back evaluation error message
                        });
                        // NOTE: Game continues until timeout or other player submits correctly
                        // OR - Decide if you want the game to end on first *incorrect* submission?
                        // If so, call endGame here with appropriate status. For now, let it continue.
                    }
                });

            });


// === Server Start ===
app.get("/", (req, res) => res.send("API is running..."));

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));